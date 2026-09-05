use tauri::command;
use tauri::Manager;

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

        let _ = overlay_window.set_ignore_cursor_events(click_through);

        #[cfg(target_os = "windows")]
        reassert_wda(&overlay_window);

        #[cfg(target_os = "macos")]
        crate::platform_macos::reassert_stream_safety(&overlay_window);
    }
}

#[command]
pub fn set_overlay_interactive(app_handle: tauri::AppHandle, interactive: bool) {
    if let Some(overlay_window) = app_handle.get_webview_window("overlay") {
        let _ = overlay_window.set_ignore_cursor_events(!interactive);

        #[cfg(target_os = "windows")]
        reassert_wda(&overlay_window);

        #[cfg(target_os = "macos")]
        crate::platform_macos::reassert_stream_safety(&overlay_window);
    }
}

/// Centralized Win32 stream safety reassertion.
/// Needed because some GPU drivers silently drop the affinity on style/click-through mutation.
#[cfg(target_os = "windows")]
fn reassert_wda(window: &tauri::WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE,
    };

    if let Ok(hwnd_ptr) = window.hwnd() {
        let hwnd = HWND(hwnd_ptr.0 as _);
        unsafe {
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
pub async fn capture_screen_crop(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    scale_factor: f64,
) -> Result<Option<String>, String> {
    // Clamp to non-negative after DPI scale — frontend already validates but be safe
    let phys_x = ((x as f64) * scale_factor).max(0.0) as i32;
    let phys_y = ((y as f64) * scale_factor).max(0.0) as i32;
    let phys_w = ((width as f64) * scale_factor) as u32;
    let phys_h = ((height as f64) * scale_factor) as u32;

    if phys_w == 0 || phys_h == 0 {
        return Ok(None);
    }

    crate::screen_capture::capture_crop_async(phys_x, phys_y, phys_w, phys_h).await
}

// ─────────────────────────────────────────────────────────────
// Stream-safety verification
// ─────────────────────────────────────────────────────────────

#[command]
pub fn verify_stream_safety(app_handle: tauri::AppHandle) -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE,
        };
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
        return false;
    }

    // On macOS, WDA_EXCLUDEFROMCAPTURE doesn't exist but the overlay is
    // transparent and invisible to screen capture by nature of being a
    // transparent, decoration-less window. Report true so the HUD shows.
    #[cfg(not(target_os = "windows"))]
    {
        let _ = app_handle; // suppress unused warning
        true
    }
}

// ─────────────────────────────────────────────────────────────
// Do Mode — structured AI action execution
// ─────────────────────────────────────────────────────────────

#[command]
pub fn execute_do_action(action: crate::input_injector::DoAction) -> Result<(), String> {
    crate::input_injector::execute_action(&action)
}
