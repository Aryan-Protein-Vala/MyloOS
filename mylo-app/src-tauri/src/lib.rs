pub mod hotkey;
pub mod input_injector;
pub mod ipc;
pub mod platform_macos;
pub mod screen_capture;
pub mod state;
pub mod storage;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

use crate::state::AppState;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongW, SetWindowDisplayAffinity, SetWindowLongW, GWL_EXSTYLE, WDA_EXCLUDEFROMCAPTURE,
    WS_EX_LAYERED, WS_EX_NOACTIVATE, WS_EX_TOPMOST, WS_EX_TRANSPARENT,
};

/// Apply the Win32 extended styles the overlay needs.
///
/// - `WS_EX_LAYERED`     — required for per-pixel alpha on a transparent window
/// - `WS_EX_TRANSPARENT` — start click-through; `set_ignore_cursor_events`
///                         toggles this later. Without it here, the overlay's
///                         first appearance swallows every click on the desktop.
/// - `WS_EX_NOACTIVATE`  — showing the overlay must not steal focus from the
///                         app the user is actually working in
/// - `WS_EX_TOPMOST`     — float above ordinary windows
///
/// `WDA_EXCLUDEFROMCAPTURE` is what keeps the overlay off screen shares. It
/// needs Windows 10 2004 or newer; on older builds the call fails and we log
/// it rather than pretending the shield is up.
#[cfg(target_os = "windows")]
fn configure_overlay_window(window: &tauri::WebviewWindow) {
    let Ok(hwnd_ptr) = window.hwnd() else {
        log::error!("[MYLO] Overlay has no HWND; skipping Win32 configuration");
        return;
    };
    let hwnd = HWND(hwnd_ptr.0 as _);

    unsafe {
        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
        SetWindowLongW(
            hwnd,
            GWL_EXSTYLE,
            ex_style
                | WS_EX_LAYERED.0 as i32
                | WS_EX_TRANSPARENT.0 as i32
                | WS_EX_NOACTIVATE.0 as i32
                | WS_EX_TOPMOST.0 as i32,
        );

        if SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE).is_err() {
            log::warn!(
                "[MYLO] Could not exclude the overlay from screen capture. \
                 Windows 10 2004 or newer is required; the Stream Shield badge will stay off."
            );
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            ipc::toggle_overlay,
            ipc::set_overlay_interactive,
            ipc::set_overlay_mode,
            ipc::get_shortcuts,
            ipc::get_platform,
            ipc::save_api_key,
            ipc::get_api_key,
            ipc::delete_api_key,
            ipc::list_saved_providers,
            ipc::capture_screen_crop,
            ipc::verify_stream_safety,
            ipc::approve_do_action,
            ipc::execute_do_action,
            ipc::cancel_do_action,
        ])
        .setup(|app| {
            if let Some(overlay_window) = app.get_webview_window("overlay") {
                #[cfg(target_os = "windows")]
                configure_overlay_window(&overlay_window);

                #[cfg(target_os = "macos")]
                crate::platform_macos::setup_overlay(&overlay_window);

                // Belt and braces: whatever the platform layer did, the
                // overlay starts click-through.
                let _ = overlay_window.set_ignore_cursor_events(true);
            } else {
                log::error!("[MYLO] Overlay window missing from tauri.conf.json");
            }

            hotkey::register_hotkeys(app.handle());

            // ── System tray ──
            let show_item = MenuItemBuilder::with_id("show", "Open MYLO").build(app)?;
            let ask_item = MenuItemBuilder::with_id("ask", "Ask about my screen").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit MYLO").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&show_item, &ask_item])
                .separator()
                .items(&[&quit_item])
                .build()?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                // On macOS a left click must open the menu — there is no
                // separate "tray click" convention as there is on Windows,
                // and without this the icon appears dead.
                .show_menu_on_left_click(cfg!(target_os = "macos"))
                .tooltip("MYLO — Motion. Your Live Operator.");

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
                // Render as a monochrome template so it adapts to light and
                // dark menu bars instead of showing a coloured blob.
                #[cfg(target_os = "macos")]
                {
                    tray_builder = tray_builder.icon_as_template(true);
                }
            }

            tray_builder
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(main) = app.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.unminimize();
                            let _ = main.set_focus();
                        }
                    }
                    "ask" => {
                        if let Some(overlay) = app.get_webview_window("overlay") {
                            use tauri::Emitter;
                            app.state::<AppState>().set_mode(state::OverlayMode::Ask);
                            let _ = ipc::position_overlay_on_active_monitor(app);
                            let _ = overlay.emit("overlay-state-changed", "ask");
                            let _ = overlay.show();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    // Only react to a completed left click. `Click` also fires
                    // for right/middle buttons, which would fight the menu.
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(main) = tray.app_handle().get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.unminimize();
                            let _ = main.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } = event
            {
                // MYLO lives in the tray. Closing the dashboard hides it
                // rather than tearing down the app and its hotkeys.
                if label == "main" {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                }
            }
        });
}
