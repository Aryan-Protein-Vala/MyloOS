pub mod ipc;
pub mod hotkey;
pub mod storage;
pub mod screen_capture;
pub mod input_injector;

use tauri::Manager;

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
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ipc::toggle_overlay,
            ipc::save_api_key,
            ipc::get_api_key,
            ipc::capture_active_monitor,
            ipc::capture_screen_crop,
            ipc::set_overlay_interactive,
            ipc::verify_stream_safety,
            ipc::execute_do_action,
        ])
        .setup(|app| {
            // ── Overlay window: make it click-through, topmost, and stream-safe ──
            let overlay_window = app.get_webview_window("overlay").unwrap();

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
                            | WS_EX_TRANSPARENT.0 as i32
                            | WS_EX_TOPMOST.0 as i32,
                    );
                    let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
                }
            }

            // ── Register global hotkeys AFTER setup so the window handle exists ──
            hotkey::register_hotkeys(app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
