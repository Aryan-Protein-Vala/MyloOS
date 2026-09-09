//! Shared runtime state.
//!
//! Two things need a single source of truth across the hotkey handlers, the
//! IPC commands and the tray:
//!
//! 1. **Which overlay mode is active.** Previously each hotkey closure owned
//!    its own `Arc<Mutex<bool>>`, so pressing the Do hotkey while Ask was open
//!    just hid the window instead of switching modes, and the two closures
//!    could disagree about whether the overlay was showing at all.
//! 2. **Whether input injection is currently permitted.** Do Mode drives the
//!    real mouse and keyboard, so it needs an explicit arm/disarm gate and a
//!    rate limit rather than executing whatever the model returns on demand.

use std::sync::Mutex;
use std::time::{Duration, Instant};

/// What the overlay is currently showing.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum OverlayMode {
    #[default]
    Hidden,
    Ask,
    Do,
    Coach,
    Agent,
}

impl OverlayMode {
    /// Wire format shared with the frontend's `overlay-state-changed` event.
    pub fn as_str(self) -> &'static str {
        match self {
            OverlayMode::Hidden => "hidden",
            OverlayMode::Ask => "ask",
            OverlayMode::Do => "do",
            OverlayMode::Coach => "coach",
            OverlayMode::Agent => "agent",
        }
    }

    pub fn is_visible(self) -> bool {
        self != OverlayMode::Hidden
    }
}

/// No more than this many injected input actions in `RATE_WINDOW`.
///
/// A model that returns a loop of click actions, or a renderer that has been
/// compromised, should not be able to drive thousands of synthetic events.
const RATE_LIMIT: usize = 12;
const RATE_WINDOW: Duration = Duration::from_secs(10);

/// Guard around OS-level input injection.
#[derive(Default)]
pub struct ActionGuard {
    /// Set only while a Do Mode action has been explicitly approved by the
    /// user and is awaiting execution. Cleared immediately after execution and
    /// by the panic hotkey.
    armed: Option<String>,
    recent: Vec<Instant>,
}

impl ActionGuard {
    /// Allow exactly one subsequent `execute_do_action` call.
    pub fn arm(&mut self, action: String) {
        self.armed = Some(action);
    }

    /// Revoke a pending approval — used by the panic hotkey and on overlay hide.
    pub fn disarm(&mut self) {
        self.armed = None;
    }

    /// Consume the arm token and check the rate limit.
    pub fn try_consume(&mut self, action: &str) -> Result<(), String> {
        let expected = self.armed.take();
        if expected.is_none() {
            return Err(
                "No approved action is pending. Actions must be approved in the overlay first."
                    .to_string(),
            );
        }
        if expected.as_deref() != Some(action) {
            return Err(
                "The action to execute does not match the approved action."
                    .to_string(),
            );
        }

        let now = Instant::now();
        self.recent.retain(|t| now.checked_duration_since(*t).is_some_and(|d| d < RATE_WINDOW));
        if self.recent.len() >= RATE_LIMIT {
            return Err(format!(
                "Too many actions ({RATE_LIMIT} in {}s). Slow down or restart MYLO.",
                RATE_WINDOW.as_secs()
            ));
        }
        self.recent.push(now);
        Ok(())
    }
}

/// Managed application state, retrieved with `app.state::<AppState>()`.
#[derive(Default)]
pub struct AppState {
    pub mode: Mutex<OverlayMode>,
    pub actions: Mutex<ActionGuard>,
    pub active_agents: Mutex<std::collections::HashMap<String, tokio::task::AbortHandle>>,
    pub last_synthetic_pos: Mutex<Option<(i32, i32)>>,
}

impl AppState {
    pub fn mode(&self) -> OverlayMode {
        *self.mode.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn set_mode(&self, mode: OverlayMode) {
        let mut guard = self.mode.lock().unwrap_or_else(|p| p.into_inner());
        *guard = mode;
    }

    pub fn arm(&self, action: String) {
        let mut guard = self.actions.lock().unwrap_or_else(|p| p.into_inner());
        guard.arm(action);
    }

    pub fn disarm(&self) {
        let mut guard = self.actions.lock().unwrap_or_else(|p| p.into_inner());
        guard.disarm();
    }

    pub fn try_consume(&self, action: &str) -> Result<(), String> {
        let mut guard = self.actions.lock().unwrap_or_else(|p| p.into_inner());
        guard.try_consume(action)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execution_requires_an_arm() {
        let mut guard = ActionGuard::default();
        assert!(guard.try_consume("action").is_err());
        guard.arm("action".to_string());
        assert!(guard.try_consume("action").is_ok());
        // The arm is single-use.
        assert!(guard.try_consume("action").is_err());
    }

    #[test]
    fn disarm_revokes_a_pending_approval() {
        let mut guard = ActionGuard::default();
        guard.arm("action".to_string());
        guard.disarm();
        assert!(guard.try_consume("action").is_err());
    }

    #[test]
    fn rate_limit_trips_after_the_cap() {
        let mut guard = ActionGuard::default();
        for _ in 0..RATE_LIMIT {
            guard.arm("action".to_string());
            assert!(guard.try_consume("action").is_ok());
        }
        guard.arm("action".to_string());
        assert!(guard.try_consume("action").is_err());
    }

    #[test]
    fn hidden_mode_is_not_visible() {
        assert!(!OverlayMode::Hidden.is_visible());
        assert!(OverlayMode::Ask.is_visible());
        assert_eq!(OverlayMode::Do.as_str(), "do");
    }

    #[test]
    fn clock_inversion_does_not_panic() {
        let mut guard = ActionGuard::default();
        // Insert a timestamp in the future to simulate clock rollback
        guard.recent.push(Instant::now() + Duration::from_secs(60));
        guard.arm("action".to_string());
        assert!(guard.try_consume("action").is_ok());
    }

    #[test]
    fn app_state_initializes_active_agents() {
        let state = AppState::default();
        assert!(state.active_agents.lock().unwrap().is_empty());
    }

    #[test]
    fn app_state_initializes_last_synthetic_pos() {
        let state = AppState::default();
        assert_eq!(*state.last_synthetic_pos.lock().unwrap(), None);
    }

    #[test]
    fn mode_mutex_poison_recovery() {
        let state = AppState::default();
        // Intentionally poison the mode mutex
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = state.mode.lock().unwrap();
            panic!("force poison mode mutex");
        }));
        assert!(state.mode.is_poisoned());

        // mode() and set_mode() must safely recover without bricking or staying stuck
        assert_eq!(state.mode(), OverlayMode::Hidden);
        state.set_mode(OverlayMode::Do);
        assert_eq!(state.mode(), OverlayMode::Do);
    }

    #[test]
    fn action_guard_mutex_poison_recovery() {
        let state = AppState::default();
        // Intentionally poison the actions mutex
        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = state.actions.lock().unwrap();
            panic!("force poison actions mutex");
        }));
        assert!(state.actions.is_poisoned());

        // arm() and try_consume() must safely recover without panicking
        state.arm("action".to_string());
        assert!(state.try_consume("action").is_ok());
        // Consumed once, subsequent attempt is single-use error
        assert!(state.try_consume("action").is_err());
    }
}
