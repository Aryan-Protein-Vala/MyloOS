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
    armed: bool,
    recent: Vec<Instant>,
}

impl ActionGuard {
    /// Allow exactly one subsequent `execute_do_action` call.
    pub fn arm(&mut self) {
        self.armed = true;
    }

    /// Revoke a pending approval — used by the panic hotkey and on overlay hide.
    pub fn disarm(&mut self) {
        self.armed = false;
    }

    /// Consume the arm token and check the rate limit.
    pub fn try_consume(&mut self) -> Result<(), String> {
        if !self.armed {
            return Err(
                "No approved action is pending. Actions must be approved in the overlay first."
                    .to_string(),
            );
        }
        self.armed = false;

        let now = Instant::now();
        self.recent.retain(|t| now.duration_since(*t) < RATE_WINDOW);
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
}

impl AppState {
    pub fn mode(&self) -> OverlayMode {
        self.mode.lock().map(|m| *m).unwrap_or_default()
    }

    pub fn set_mode(&self, mode: OverlayMode) {
        if let Ok(mut guard) = self.mode.lock() {
            *guard = mode;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execution_requires_an_arm() {
        let mut guard = ActionGuard::default();
        assert!(guard.try_consume().is_err());
        guard.arm();
        assert!(guard.try_consume().is_ok());
        // The arm is single-use.
        assert!(guard.try_consume().is_err());
    }

    #[test]
    fn disarm_revokes_a_pending_approval() {
        let mut guard = ActionGuard::default();
        guard.arm();
        guard.disarm();
        assert!(guard.try_consume().is_err());
    }

    #[test]
    fn rate_limit_trips_after_the_cap() {
        let mut guard = ActionGuard::default();
        for _ in 0..RATE_LIMIT {
            guard.arm();
            assert!(guard.try_consume().is_ok());
        }
        guard.arm();
        assert!(guard.try_consume().is_err());
    }

    #[test]
    fn hidden_mode_is_not_visible() {
        assert!(!OverlayMode::Hidden.is_visible());
        assert!(OverlayMode::Ask.is_visible());
        assert_eq!(OverlayMode::Do.as_str(), "do");
    }
}
