use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Registers all global MYLO hotkeys:
/// - Cmd/Ctrl+Shift+Space  → toggle Ask Mode
/// - Cmd/Ctrl+Shift+D      → toggle Do Mode
pub fn register_hotkeys(app: &AppHandle) {
    let app_ask = app.clone();
    let app_do = app.clone();

    // Using SUPER/CONTROL + SHIFT + SPACE to avoid Alt+Space OS collisions
    let ask_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::CONTROL | Modifiers::SHIFT), Code::Space);
    let do_shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyD);

    if let Err(e) = app.global_shortcut().on_shortcut(ask_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_ask.get_webview_window("overlay") {
            let is_visible = overlay.is_visible().unwrap_or(false);
            if is_visible {
                let _ = overlay.emit("overlay-state-changed", "hidden");
                let _ = overlay.hide();
            } else {
                let _ = overlay.emit("overlay-state-changed", "ask");
                let _ = overlay.show();
                let _ = overlay.set_focus();
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Ask hotkey: {}", e);
    }

    if let Err(e) = app.global_shortcut().on_shortcut(do_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_do.get_webview_window("overlay") {
            let is_visible = overlay.is_visible().unwrap_or(false);
            if is_visible {
                let _ = overlay.emit("overlay-state-changed", "hidden");
                let _ = overlay.hide();
            } else {
                let _ = overlay.emit("overlay-state-changed", "do");
                let _ = overlay.show();
                let _ = overlay.set_focus();
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Do hotkey: {}", e);
    }
}
