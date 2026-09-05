use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Registers all global MYLO hotkeys:
/// - Alt+Space  → toggle Ask Mode overlay
/// - Alt+Shift+S → toggle Do Mode overlay  
/// - Esc (double) handled in frontend via keydown listener
pub fn register_hotkeys(app: &AppHandle) {
    let app_ask = app.clone();
    let app_do = app.clone();

    let ask_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
    let do_shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyS);

    if let Err(e) = app.global_shortcut().on_shortcut(ask_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_ask.get_webview_window("overlay") {
            let _ = overlay.emit("overlay-state-changed", "ask");
            let _ = overlay.show();
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Alt+Space: {}", e);
    }

    if let Err(e) = app.global_shortcut().on_shortcut(do_shortcut, move |_app, _shortcut, _event| {
        if let Some(overlay) = app_do.get_webview_window("overlay") {
            let _ = overlay.emit("overlay-state-changed", "do");
            let _ = overlay.show();
        }
    }) {
        eprintln!("[MYLO hotkeys] Failed to register Alt+Shift+S: {}", e);
    }
}
