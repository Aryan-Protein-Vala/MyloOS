#[cfg(target_os = "windows")]
pub fn snap_to_element(x: i32, y: i32) -> Option<(i32, i32)> {
    use windows::core::ComInterface;
    use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};
    use windows::Win32::UI::Accessibility::{CUIAutomation, IUIAutomation};

    // Attempt to initialize COM. It might already be initialized by Tauri on this thread,
    // in which case it might return an error, but we can usually safely ignore it.
    let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };

    unsafe {
        let automation: IUIAutomation =
            match windows::core::factory::<CUIAutomation, IUIAutomation>() {
                Ok(a) => a,
                Err(e) => {
                    log::error!("Failed to create IUIAutomation instance: {:?}", e);
                    return None;
                }
            };

        let pt = windows::Win32::Foundation::POINT { x, y };
        let element = match automation.ElementFromPoint(pt) {
            Ok(e) => e,
            Err(e) => {
                log::warn!("ElementFromPoint failed: {:?}", e);
                return None;
            }
        };

        let rect = match element.CurrentBoundingRectangle() {
            Ok(r) => r,
            Err(e) => {
                log::warn!("Failed to get bounding rect: {:?}", e);
                return None;
            }
        };

        // rect is RECT { left, top, right, bottom }
        let center_x = rect.left + (rect.right - rect.left) / 2;
        let center_y = rect.top + (rect.bottom - rect.top) / 2;

        Some((center_x, center_y))
    }
}
