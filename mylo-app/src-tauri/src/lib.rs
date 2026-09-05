#![allow(unexpected_cfgs)]

pub mod ipc;
pub mod hotkey;
pub mod storage;
pub mod screen_capture;
pub mod input_injector;
pub mod platform_macos;

use tauri::{Manager, menu::{MenuBuilder, MenuItemBuilder}, tray::TrayIconBuilder};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    SetWindowDisplayAffinity, GetWindowLongW, SetWindowLongW,
    GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT, WS_EX_TOPMOST, WDA_EXCLUDEFROMCAPTURE,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ipc::toggle_overlay,
            ipc::save_api_key,
            ipc::get_api_key,
            ipc::set_active_provider,
            ipc::get_active_provider,
            ipc::capture_screen_crop,
            ipc::set_overlay_interactive,
            ipc::verify_stream_safety,
            ipc::execute_do_action,
            ipc::ask_ai,
            ipc::analyze_for_do_mode,
        ])
        .setup(|app| {
            // ── Overlay window: make it click-through, topmost, and stream-safe ──
            if let Some(overlay_window) = app.get_webview_window("overlay") {
                #[cfg(target_os = "windows")]
                {
                    let hwnd_raw = overlay_window.hwnd().unwrap().0 as isize;
                    let hwnd = HWND(hwnd_raw as _);

                    unsafe {
                        let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                        SetWindowLongW(
                            hwnd,
                            GWL_EXSTYLE,
                            ex_style
                                | WS_EX_LAYERED.0 as i32
                                | WS_EX_TOPMOST.0 as i32,
                        );
                        let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
                    }
                }

                #[cfg(target_os = "macos")]
                crate::platform_macos::setup_overlay(&overlay_window);
            }

            // ── Register global hotkeys AFTER setup so the window handle exists ──
            hotkey::register_hotkeys(app.handle());

            // ── System Tray ──
            let quit_item = MenuItemBuilder::with_id("quit", "Quit MYLO").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&quit_item]).build()?;
            let mut tray_builder = TrayIconBuilder::new().menu(&menu);
            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }
            let _tray = tray_builder
                .on_menu_event(move |app, event| {
                    if event.id == quit_item.id() {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(main) = tray.app_handle().get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::CloseRequested { api, .. }, .. } => {
                if label == "main" || label == "overlay" {
                    api.prevent_close();
                    if let Some(window) = app_handle.get_webview_window(&label) {
                        let _ = window.hide();
                    }
                }
            }
            _ => {}
        });
}
