#![allow(unexpected_cfgs)]

pub mod db;
pub mod hotkey;
pub mod input_injector;
pub mod ipc;
pub mod orchestrator;
pub mod platform_macos;
pub mod prompts;
pub mod screen_capture;
pub mod security;
pub mod state;
pub mod storage;
pub mod telemetry;
pub mod ui_snapper;

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongW, SetWindowDisplayAffinity, SetWindowLongW, GWL_EXSTYLE, WDA_EXCLUDEFROMCAPTURE,
    WS_EX_LAYERED, WS_EX_TOPMOST, WS_EX_TRANSPARENT,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(state::AppState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ipc::toggle_overlay,
            ipc::save_api_key,
            ipc::get_api_key,
            ipc::set_active_provider,
            ipc::get_active_provider,
            ipc::delete_api_key,
            ipc::list_saved_providers,
            ipc::save_license_key,
            ipc::get_license_key,
            ipc::get_shortcuts,
            ipc::get_platform,
            ipc::set_overlay_mode,
            ipc::approve_do_action,
            ipc::cancel_do_action,
            ipc::dismiss,
            ipc::capture_screen_crop,
            ipc::set_overlay_interactive,
            ipc::verify_stream_safety,
            ipc::execute_do_action,
            ipc::ask_ai,
            ipc::get_chat_history,
            ipc::analyze_for_do_mode,
            ipc::execute_agentic_action,
            ipc::execute_agentic_chain,
            ipc::spawn_headless_agent,
            ipc::kill_headless_agent,
            ipc::check_permissions,
            ipc::request_accessibility_permissions,
            ipc::request_screen_recording_permissions,
            ipc::get_active_agents,
        ])
        .setup(|app| {
            // ── Overlay window: make it click-through, topmost, and stream-safe ──
            if let Some(overlay_window) = app.get_webview_window("overlay") {
                #[cfg(target_os = "windows")]
                {
                    if let Ok(hwnd_t) = overlay_window.hwnd() {
                        let hwnd = HWND(hwnd_t.0 as _);
                        unsafe {
                            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                            SetWindowLongW(
                                hwnd,
                                GWL_EXSTYLE,
                                ex_style
                                    | WS_EX_LAYERED.0 as i32
                                    | WS_EX_TRANSPARENT.0 as i32
                                    | WS_EX_TOPMOST.0 as i32,
                            );
                            let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
                        }
                    }
                }

                #[cfg(target_os = "macos")]
                crate::platform_macos::setup_overlay(&overlay_window);
            }

            // ── Register global hotkeys AFTER setup so the window handle exists ──
            hotkey::register_hotkeys(app.handle());

            // ── Start Native OS Telemetry Loop ──
            telemetry::start_telemetry(app.handle().clone());

            // ── Initialize Chat History DB ──
            let _ = db::init_db(app.handle());

            // ── System Tray ──
            let open_item = MenuItemBuilder::with_id("open", "Open Dashboard").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quit MYLO").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&open_item, &quit_item])
                .build()?;
            let mut tray_builder = TrayIconBuilder::new().menu(&menu);
            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }
            let _tray = tray_builder
                .on_menu_event(move |app, event| {
                    if event.id == "open" {
                        if let Some(main) = app.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                    } else if event.id == "quit" {
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
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. } => {
                let state = app_handle.state::<state::AppState>();
                let mut agents = state
                    .active_agents
                    .lock()
                    .unwrap_or_else(|p| p.into_inner());
                for (_, handle) in agents.drain() {
                    handle.abort();
                }
            }
            tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" || label == "overlay" => {
                api.prevent_close();
                if let Some(window) = app_handle.get_webview_window(&label) {
                    let _ = window.hide();
                }
            }
            _ => {}
        });
}
