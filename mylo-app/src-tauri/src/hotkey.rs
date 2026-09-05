use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Registers all global MYLO hotkeys:
/// - Cmd/Ctrl+Shift+Space  → toggle Ask Mode (or switch to Ask if already open)
/// - Cmd/Ctrl+Shift+D      → toggle Do Mode (or switch to Do if already open)
pub fn register_hotkeys(app: &AppHandle) {
    let mode_state = Arc::new(Mutex::new("hidden".to_string()));
    let mode_state_ask = Arc::clone(&mode_state);
    let mode_state_do = Arc::clone(&mode_state);

    let app_ask = app.clone();
    let app_do = app.clone();

    #[cfg(target_os = "macos")]
    let modifiers = Modifiers::SUPER | Modifiers::SHIFT;
    #[cfg(not(target_os = "macos"))]
    let modifiers = Modifiers::CONTROL | Modifiers::SHIFT;

    let ask_shortcut = Shortcut::new(Some(modifiers), Code::Space);
    let do_shortcut = Shortcut::new(Some(modifiers), Code::KeyD);

    if let Err(e) = app.global_shortcut().on_shortcut(ask_shortcut, move |_app, _shortcut, _event| {
        if _event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(overlay) = app_ask.get_webview_window("overlay") {
                let is_visible = overlay.is_visible().unwrap_or(false);
                let mut current = mode_state_ask.lock().unwrap();

                if is_visible && *current == "ask" {
                    *current = "hidden".to_string();
                    let _ = overlay.emit("overlay-state-changed", "hidden");
                    let _ = overlay.hide();
                } else {
                    *current = "ask".to_string();
                    let _ = overlay.emit("overlay-state-changed", "ask");
                    let _ = overlay.show();
                    let _ = overlay.set_focus();

                    #[cfg(target_os = "macos")]
                    crate::platform_macos::reassert_stream_safety(&overlay);
                }
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Ask hotkey: {}", e);
    }

    if let Err(e) = app.global_shortcut().on_shortcut(do_shortcut, move |_app, _shortcut, _event| {
        if _event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            if let Some(overlay) = app_do.get_webview_window("overlay") {
                let is_visible = overlay.is_visible().unwrap_or(false);
                let mut current = mode_state_do.lock().unwrap();

                if is_visible && *current == "do" {
                    *current = "hidden".to_string();
                    let _ = overlay.emit("overlay-state-changed", "hidden");
                    let _ = overlay.hide();
                } else {
                    *current = "do".to_string();
                    let _ = overlay.emit("overlay-state-changed", "do");
                    let _ = overlay.show();
                    let _ = overlay.set_focus();

                    #[cfg(target_os = "macos")]
                    crate::platform_macos::reassert_stream_safety(&overlay);
                }
            }
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Do hotkey: {}", e);
    }
}
