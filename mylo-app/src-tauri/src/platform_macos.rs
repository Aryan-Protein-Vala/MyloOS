/// macOS-specific overlay window setup.
///
/// Uses raw ObjC message sends to configure:
/// - NSWindowSharingNone  → invisible to OBS, screen recorders, Zoom
/// - NSScreenSaverWindowLevel (1000) → floats above all app windows
/// - CanJoinAllSpaces | Stationary  → visible on every Mission Control Space
///
/// SAFETY: all pointers come from Tauri's window handle which is valid
/// for the duration of the app session.

#[cfg(target_os = "macos")]
use objc::{msg_send, runtime::Object, sel, sel_impl};

/// Apply all macOS overlay styles. Call once at startup and after any
/// window visibility toggle that might reset NSWindow properties.
#[cfg(target_os = "macos")]
pub fn setup_overlay(window: &tauri::WebviewWindow) {
    if let Ok(raw_ptr) = window.ns_window() {
        unsafe {
            let ns_win = raw_ptr as *mut Object;

            // NSWindowSharingNone = 0  (prevents capture by OBS, Zoom, etc.)
            let _: () = msg_send![ns_win, setSharingType: 0usize];

            // NSScreenSaverWindowLevel ≈ 1000 — above all app windows
            let _: () = msg_send![ns_win, setLevel: 1000i64];

            // NSWindowCollectionBehaviorCanJoinAllSpaces (bit 0) |
            // NSWindowCollectionBehaviorStationary       (bit 4)
            let _: () = msg_send![ns_win, setCollectionBehavior: 0b10001usize];

            // Ignore mouse events by default (click-through)
            let _: () = msg_send![ns_win, setIgnoresMouseEvents: true];
        }
    }
}

/// Re-assert NSWindowSharingNone after any show/hide cycle that may reset it.
#[cfg(target_os = "macos")]
pub fn reassert_stream_safety(window: &tauri::WebviewWindow) {
    if let Ok(raw_ptr) = window.ns_window() {
        unsafe {
            let ns_win = raw_ptr as *mut Object;
            let _: () = msg_send![ns_win, setSharingType: 0usize];
        }
    }
}

/// Returns true when NSWindowSharingNone is active — equivalent to WDA on Windows.
#[cfg(target_os = "macos")]
pub fn is_stream_safe(window: &tauri::WebviewWindow) -> bool {
    if let Ok(raw_ptr) = window.ns_window() {
        unsafe {
            let ns_win = raw_ptr as *mut Object;
            let sharing_type: usize = msg_send![ns_win, sharingType];
            return sharing_type == 0; // NSWindowSharingNone
        }
    }
    false
}

/// Cross-platform stub — no-op on non-macOS.
#[cfg(not(target_os = "macos"))]
pub fn setup_overlay(_window: &tauri::WebviewWindow) {}
#[cfg(not(target_os = "macos"))]
pub fn reassert_stream_safety(_window: &tauri::WebviewWindow) {}
#[cfg(not(target_os = "macos"))]
pub fn is_stream_safe(_window: &tauri::WebviewWindow) -> bool { false }
