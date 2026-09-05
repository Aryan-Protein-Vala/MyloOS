use tauri::command;
use tauri::Manager;
use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────────────────────
// Overlay window control
// ─────────────────────────────────────────────────────────────

#[command]
pub fn toggle_overlay(app_handle: tauri::AppHandle, visible: bool, click_through: bool) {
    if let Some(overlay_window) = app_handle.get_webview_window("overlay") {
        if visible {
            let _ = overlay_window.show();
        } else {
            let _ = overlay_window.hide();
        }

        #[cfg(target_os = "windows")]
        apply_window_styles(&overlay_window, click_through);
    }
}

#[command]
pub fn set_overlay_interactive(app_handle: tauri::AppHandle, interactive: bool) {
    if let Some(overlay_window) = app_handle.get_webview_window("overlay") {
        #[cfg(target_os = "windows")]
        apply_window_styles(&overlay_window, !interactive);
    }
}

/// Sets WS_EX_TRANSPARENT and re-asserts WDA_EXCLUDEFROMCAPTURE so
/// every style mutation keeps the stream-safety guarantee intact.
#[cfg(target_os = "windows")]
fn apply_window_styles(window: &tauri::WebviewWindow, click_through: bool) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongW, SetWindowLongW, SetWindowDisplayAffinity,
        GWL_EXSTYLE, WS_EX_TRANSPARENT, WDA_EXCLUDEFROMCAPTURE,
    };

    if let Ok(hwnd_ptr) = window.hwnd() {
        let hwnd = HWND(hwnd_ptr.0 as _);
        unsafe {
            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE);
            if click_through {
                SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_TRANSPARENT.0 as i32);
            } else {
                SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style & !(WS_EX_TRANSPARENT.0 as i32));
            }
            // Always re-assert WDA — toggling ex_style can drop it on some drivers
            let _ = SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// API Key storage (real, persistent via tauri-plugin-store)
// ─────────────────────────────────────────────────────────────

#[command]
pub fn save_api_key(app_handle: tauri::AppHandle, provider: String, key: String) {
    crate::storage::save_key(&app_handle, &provider, &key);
}

#[command]
pub fn get_api_key(app_handle: tauri::AppHandle, provider: String) -> Option<String> {
    crate::storage::get_key(&app_handle, &provider)
}

// ─────────────────────────────────────────────────────────────
// Screen capture
// ─────────────────────────────────────────────────────────────

#[command]
pub fn capture_active_monitor() -> Vec<u8> {
    crate::screen_capture::capture()
}

#[command]
pub async fn capture_screen_crop(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    scale_factor: f64,
) -> Result<Option<String>, String> {
    let phys_x = (x as f64 * scale_factor) as i32;
    let phys_y = (y as f64 * scale_factor) as i32;
    let phys_w = ((width as f64) * scale_factor) as u32;
    let phys_h = ((height as f64) * scale_factor) as u32;
    Ok(crate::screen_capture::capture_crop_async(phys_x, phys_y, phys_w, phys_h).await)
}

// ─────────────────────────────────────────────────────────────
// Stream-safety verification
// ─────────────────────────────────────────────────────────────

#[command]
pub fn verify_stream_safety(app_handle: tauri::AppHandle) -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{GetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE};
        if let Some(window) = app_handle.get_webview_window("overlay") {
            if let Ok(hwnd_ptr) = window.hwnd() {
                let hwnd = HWND(hwnd_ptr.0 as _);
                let mut affinity = 0u32;
                unsafe {
                    if GetWindowDisplayAffinity(hwnd, &mut affinity).is_ok() {
                        return affinity == WDA_EXCLUDEFROMCAPTURE.0;
                    }
                }
            }
        }
    }
    false
}

// ─────────────────────────────────────────────────────────────
// Do Mode — structured AI action approval & execution
// ─────────────────────────────────────────────────────────────

/// Called by the frontend when the user clicks "Approve" on the Do card.
/// `action` is a structured JSON object from the AI response.
#[command]
pub fn execute_do_action(action: crate::input_injector::DoAction) -> Result<(), String> {
    crate::input_injector::execute_action(&action)
}
