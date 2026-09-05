use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
use std::sync::{Arc, Mutex};

/// Registers all global MYLO hotkeys:
/// - Alt+Space       → toggle Ask Mode (shows overlay or hides if already in ask)
/// - Alt+Shift+S     → toggle Do Mode  (shows overlay or hides if already in do)
/// - Esc double-tap  → handled in frontend via keydown listener
pub fn register_hotkeys(app: &AppHandle) {
    let app_ask = app.clone();
    let app_do = app.clone();

    // Track current overlay state so hotkeys can toggle properly
    let state_ask: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    let state_do: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));

    let ask_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    let do_shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyS);

    if let Err(e) = app.global_shortcut().on_shortcut(ask_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_ask.get_webview_window("overlay") {
            let mut active = state_ask.lock().unwrap();
            if *active {
                // Already in ask mode → dismiss
                let _ = overlay.emit("overlay-state-changed", "hidden");
                let _ = overlay.hide();
                *active = false;
            } else {
                let _ = overlay.emit("overlay-state-changed", "ask");
                let _ = overlay.show();
                *active = true;
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Alt+Space: {}", e);
    }

    if let Err(e) = app.global_shortcut().on_shortcut(do_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_do.get_webview_window("overlay") {
            let mut active = state_do.lock().unwrap();
            if *active {
                // Already in do mode → dismiss
                let _ = overlay.emit("overlay-state-changed", "hidden");
                let _ = overlay.hide();
                *active = false;
            } else {
                let _ = overlay.emit("overlay-state-changed", "do");
                let _ = overlay.show();
                *active = true;
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Alt+Shift+S: {}", e);
    }
}
