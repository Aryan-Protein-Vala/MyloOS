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
    GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT, WS_EX_TOPMOST, WDA_EXCLUDEFROMCAPTURE
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            ipc::toggle_overlay,
            ipc::save_api_key,
            ipc::get_api_key,
            ipc::capture_active_monitor,
            ipc::approve_do_action
        ])
        .setup(|app| {
            let overlay_window = app.get_webview_window("overlay").unwrap();
            
            #[cfg(target_os = "windows")]
            {
                let hwnd = overlay_window.hwnd().unwrap().0 as isize;
                let hwnd = HWND(hwnd as _);
                
                unsafe {
                    // Make it click-through and always on top
                    let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_LAYERED.0 as i32 | WS_EX_TRANSPARENT.0 as i32 | WS_EX_TOPMOST.0 as i32);
                    
                    // Exclude from capture (WDA_EXCLUDEFROMCAPTURE)
                    let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
