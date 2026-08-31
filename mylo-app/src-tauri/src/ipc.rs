use tauri::command;
use tauri::Manager;
use tauri::Window;

#[command]
pub fn toggle_overlay(app_handle: tauri::AppHandle, visible: bool, click_through: bool) {
    if let Some(overlay_window) = app_handle.get_webview_window("overlay") {
        if visible {
            let _ = overlay_window.show();
        } else {
            let _ = overlay_window.hide();
        }
        
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::WindowsAndMessaging::{GetWindowLongW, SetWindowLongW, GWL_EXSTYLE, WS_EX_TRANSPARENT};
            
            if let Ok(hwnd_ptr) = overlay_window.hwnd() {
                let hwnd = HWND(hwnd_ptr.0 as _);
                unsafe {
                    let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
                    if click_through {
                        SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_TRANSPARENT.0 as i32);
                    } else {
                        SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style & !(WS_EX_TRANSPARENT.0 as i32));
                    }
                }
            }
        }
    }
}

#[command]
pub fn save_api_key(provider: String, key: String) {
    crate::storage::save_key(&provider, &key);
}

#[command]
pub fn get_api_key(provider: String) -> Option<String> {
    crate::storage::get_key(&provider)
}

#[command]
pub fn capture_active_monitor() -> Vec<u8> {
    crate::screen_capture::capture()
}

#[command]
pub fn approve_do_action() {
    println!("User approved DO action.");
    crate::input_injector::execute_action();
}
