//! Global hotkey registration.
//!
//! ## The double-fire bug
//!
//! `on_shortcut` fires for **both** `Pressed` and `Released`. Every handler
//! here must therefore check `event.state()` first — otherwise a single
//! keypress runs the toggle twice and the overlay flashes open and shut.
//!
//! ## Mode switching
//!
//! The handlers consult the shared `AppState` rather than raw window
//! visibility, so pressing the Do hotkey while Ask is open *switches modes*
//! instead of hiding the window.

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};

use crate::state::{AppState, OverlayMode};

/// A shortcut plus the label we show the user. The label is derived from the
/// same definition that gets registered, so the dashboard can never advertise
/// a key combination that isn't actually bound.
pub struct Binding {
    pub action: &'static str,
    pub description: &'static str,
    pub modifiers: Modifiers,
    pub code: Code,
}

impl Binding {
    fn shortcut(&self) -> Shortcut {
        Shortcut::new(Some(self.modifiers), self.code)
    }

    /// Human-readable label using the platform's conventional symbols.
    pub fn label(&self) -> String {
        let mut parts: Vec<&str> = Vec::new();

        if self.modifiers.contains(Modifiers::SUPER) {
            parts.push(if cfg!(target_os = "macos") { "Cmd" } else { "Win" });
        }
        if self.modifiers.contains(Modifiers::CONTROL) {
            parts.push("Ctrl");
        }
        if self.modifiers.contains(Modifiers::ALT) {
            parts.push(if cfg!(target_os = "macos") { "Option" } else { "Alt" });
        }
        if self.modifiers.contains(Modifiers::SHIFT) {
            parts.push("Shift");
        }

        parts.push(match self.code {
            Code::Space => "Space",
            Code::Escape => "Esc",
            Code::KeyD => "D",
            Code::KeyC => "C",
            // Fall back to the debug name minus the "Key" prefix.
            _ => "?",
        });

        parts.join(" + ")
    }
}

/// The primary modifier for MYLO's shortcuts.
///
/// Cmd on macOS, Ctrl on Windows/Linux — the combination users already expect
/// from the marketing copy and the dashboard.
const PRIMARY: Modifiers = if cfg!(target_os = "macos") {
    Modifiers::SUPER
} else {
    Modifiers::CONTROL
};

/// Modifier for the panic key.
///
/// Ctrl+Shift+Esc is permanently reserved by Windows for Task Manager and
/// cannot be registered by an application, so Windows gets Ctrl+Alt+Esc.
const PANIC_MODS: Modifiers = if cfg!(target_os = "macos") {
    Modifiers::SUPER.union(Modifiers::SHIFT)
} else {
    Modifiers::CONTROL.union(Modifiers::ALT)
};

pub fn bindings() -> Vec<Binding> {
    vec![
        Binding {
            action: "ask",
            description: "Ask about what's on screen",
            modifiers: PRIMARY.union(Modifiers::SHIFT),
            code: Code::Space,
        },
        Binding {
            action: "do",
            description: "Draw a region and let MYLO act on it",
            modifiers: PRIMARY.union(Modifiers::SHIFT),
            code: Code::KeyD,
        },
        Binding {
            action: "coach",
            description: "Step-by-step guidance overlay",
            modifiers: PRIMARY.union(Modifiers::SHIFT),
            code: Code::KeyC,
        },
        Binding {
            action: "ptt",
            description: "Push-To-Talk to MYLO",
            modifiers: Modifiers::CONTROL.union(Modifiers::ALT),
            code: Code::Space,
        },
        Binding {
            action: "panic",
            description: "Hide the overlay and cancel any pending action",
            modifiers: PANIC_MODS,
            code: Code::Escape,
        },
    ]
}

static PTT_ACTIVE: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

/// Show the overlay in `mode`, or hide it if that mode is already showing.
///
/// Deliberately does **not** call `set_focus()`. Stealing focus from whatever
/// the user is working in changes that app's state and is exactly the wrong
/// behaviour for an ambient overlay. Focus is taken later, only when the user
/// interacts with a control that needs the keyboard (see
/// `ipc::set_overlay_interactive`).
fn activate(app: &AppHandle, mode: OverlayMode) {
    let Some(overlay) = app.get_webview_window("overlay") else {
        log::error!("[MYLO hotkeys] Overlay window is missing");
        return;
    };
    let state = app.state::<AppState>();

    let next = if state.mode() == mode { OverlayMode::Hidden } else { mode };
    state.set_mode(next);

    // Tell the frontend first so it can render the right mode before the
    // window becomes visible, avoiding a flash of the previous mode.
    let _ = overlay.emit("overlay-state-changed", next.as_str());

    if next.is_visible() {
        // Cover whichever display the user is actually looking at before the
        // window becomes visible, so it never flashes on the wrong monitor.
        if let Err(e) = crate::ipc::position_overlay_on_active_monitor(app) {
            log::warn!("[MYLO hotkeys] Could not place the overlay: {e}");
        }
        let _ = overlay.show();
    } else {
        if let Ok(mut guard) = state.actions.lock() {
            guard.disarm();
        }
        let _ = overlay.set_ignore_cursor_events(true);
        let _ = overlay.hide();
    }
}

/// Hide the overlay and revoke any approved-but-unexecuted action.
fn panic_hide(app: &AppHandle) {
    let state = app.state::<AppState>();
    state.set_mode(OverlayMode::Hidden);
    if let Ok(mut guard) = state.actions.lock() {
        guard.disarm();
    }
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.emit("overlay-state-changed", "hidden");
        let _ = overlay.set_ignore_cursor_events(true);
        let _ = overlay.hide();
    }
    log::warn!("[MYLO] Panic hotkey pressed — overlay hidden, pending actions cancelled");
}

pub fn register_hotkeys(app: &AppHandle) {
    for binding in bindings() {
        let handle = app.clone();
        let action = binding.action;
        let label = binding.label();

        let result = app.global_shortcut().on_shortcut(
            binding.shortcut(),
            move |_app, _shortcut, event| {
                if action == "ptt" {
                    if event.state() == ShortcutState::Pressed {
                        // Debounce: ignore repeated Pressed events caused by OS key autorepeat
                        if !PTT_ACTIVE.swap(true, std::sync::atomic::Ordering::SeqCst) {
                            let state = handle.state::<AppState>();
                            state.set_mode(OverlayMode::Agent);
                            if let Some(overlay) = handle.get_webview_window("overlay") {
                                if let Err(e) = crate::ipc::position_overlay_on_active_monitor(&handle) {
                                    log::warn!("[MYLO hotkeys] Could not place overlay for PTT: {e}");
                                }
                                let _ = overlay.set_ignore_cursor_events(true);
                                let _ = overlay.show();
                                let _ = overlay.emit("ptt-state-changed", "pressed");
                            }
                        }
                    } else if event.state() == ShortcutState::Released {
                        if PTT_ACTIVE.swap(false, std::sync::atomic::Ordering::SeqCst) {
                            if let Some(overlay) = handle.get_webview_window("overlay") {
                                let _ = overlay.emit("ptt-state-changed", "released");
                            }
                        }
                    }
                    return;
                }

                // The handler is invoked on both key-down and key-up. Without
                // this guard every press runs the body twice.
                if event.state() != ShortcutState::Pressed {
                    return;
                }
                match action {
                    "ask" => activate(&handle, OverlayMode::Ask),
                    "do" => activate(&handle, OverlayMode::Do),
                    "coach" => activate(&handle, OverlayMode::Coach),
                    "panic" => panic_hide(&handle),
                    other => log::error!("[MYLO hotkeys] Unhandled action '{other}'"),
                }
            },
        );

        match result {
            Ok(()) => log::info!("[MYLO hotkeys] Registered {label} → {action}"),
            Err(e) => log::error!(
                "[MYLO hotkeys] Could not register {label} for '{action}': {e}. \
                 Another application probably owns this combination."
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_binding_has_a_readable_label() {
        for b in bindings() {
            let label = b.label();
            assert!(!label.contains('?'), "{} has an unmapped key code", b.action);
            assert!(label.contains(" + "), "{} label looks wrong: {label}", b.action);
        }
    }

    #[test]
    fn bindings_are_unique() {
        let all = bindings();
        for (i, a) in all.iter().enumerate() {
            for b in all.iter().skip(i + 1) {
                assert!(
                    !(a.modifiers == b.modifiers && a.code == b.code),
                    "{} and {} are bound to the same keys",
                    a.action,
                    b.action
                );
            }
        }
    }

    #[test]
    fn primary_modifier_matches_the_platform() {
        if cfg!(target_os = "macos") {
            assert!(PRIMARY.contains(Modifiers::SUPER));
        } else {
            assert!(PRIMARY.contains(Modifiers::CONTROL));
        }
    }
}
