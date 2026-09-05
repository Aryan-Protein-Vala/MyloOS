//! macOS-specific overlay window configuration.
//!
//! ## Threading
//!
//! AppKit is **not** thread-safe: `NSWindow` must only be touched from the
//! main thread. Tauri runs synchronous `#[command]` handlers on a worker
//! thread, so calling these helpers directly from a command is undefined
//! behaviour that manifests as intermittent crashes and hangs under load.
//! Every function here therefore marshals onto the main thread via
//! `run_on_main_thread`.
//!
//! ## What gets configured
//!
//! - `NSWindowSharingNone`      → invisible to OBS, Zoom, QuickTime
//! - `NSScreenSaverWindowLevel` → floats above ordinary app windows
//! - `CanJoinAllSpaces | Stationary | FullScreenAuxiliary`
//!                              → present on every Space, including over
//!                                apps that are in native fullscreen

#[cfg(target_os = "macos")]
use objc::{msg_send, runtime::Object, sel, sel_impl};
#[cfg(target_os = "macos")]
use tauri::Manager;

/// `NSWindowSharingNone` — excluded from screen sharing and recording.
#[cfg(target_os = "macos")]
const NS_WINDOW_SHARING_NONE: usize = 0;

/// `NSScreenSaverWindowLevel`.
#[cfg(target_os = "macos")]
const NS_SCREEN_SAVER_WINDOW_LEVEL: i64 = 1000;

/// `CanJoinAllSpaces (1<<0) | Stationary (1<<4) | FullScreenAuxiliary (1<<8)`.
///
/// Without `FullScreenAuxiliary` the overlay disappears the moment the user
/// puts anything into native fullscreen — which is exactly when a "help me
/// with what's on screen" tool is most useful.
#[cfg(target_os = "macos")]
const NS_COLLECTION_BEHAVIOR: usize = (1 << 0) | (1 << 4) | (1 << 8);

/// Apply the overlay's window styles. Safe to call from any thread.
#[cfg(target_os = "macos")]
pub fn setup_overlay(window: &tauri::WebviewWindow) {
    let window = window.clone();
    let handle = window.app_handle().clone();
    let result = handle.run_on_main_thread(move || {
        let Ok(raw_ptr) = window.ns_window() else {
            log::error!("[MYLO macOS] Overlay has no NSWindow handle");
            return;
        };
        // SAFETY: on the main thread, with a pointer Tauri guarantees is a
        // live NSWindow for the lifetime of the window.
        unsafe {
            let ns_win = raw_ptr as *mut Object;
            let _: () = msg_send![ns_win, setSharingType: NS_WINDOW_SHARING_NONE];
            let _: () = msg_send![ns_win, setLevel: NS_SCREEN_SAVER_WINDOW_LEVEL];
            let _: () = msg_send![ns_win, setCollectionBehavior: NS_COLLECTION_BEHAVIOR];
            // Never take key/main focus away from the app the user is in.
            let _: () = msg_send![ns_win, setIgnoresMouseEvents: true];
        }
    });

    if let Err(e) = result {
        log::error!("[MYLO macOS] Could not configure the overlay window: {e}");
    }
}

/// Re-assert `NSWindowSharingNone`.
///
/// Some show/hide cycles and display reconfigurations reset the sharing type,
/// which would silently expose the overlay on a stream.
#[cfg(target_os = "macos")]
pub fn reassert_stream_safety(window: &tauri::WebviewWindow) {
    let window = window.clone();
    let handle = window.app_handle().clone();
    let result = handle.run_on_main_thread(move || {
        if let Ok(raw_ptr) = window.ns_window() {
            unsafe {
                let ns_win = raw_ptr as *mut Object;
                let _: () = msg_send![ns_win, setSharingType: NS_WINDOW_SHARING_NONE];
            }
        }
    });

    if let Err(e) = result {
        log::error!("[MYLO macOS] Could not re-assert stream safety: {e}");
    }
}

/// Read back the real `sharingType`.
///
/// This blocks briefly on a main-thread round trip, which is acceptable
/// because it is only called from the overlay's HUD refresh. It must be an
/// actual read: reporting a hardcoded `true` here would put a "Stream Shield
/// Active" badge on screen without checking anything.
#[cfg(target_os = "macos")]
pub fn is_stream_safe(window: &tauri::WebviewWindow) -> bool {
    use std::sync::mpsc;
    use std::time::Duration;

    let (tx, rx) = mpsc::channel();
    let window = window.clone();

    let handle = window.app_handle().clone();
    let dispatched = handle.run_on_main_thread(move || {
        let safe = match window.ns_window() {
            Ok(raw_ptr) => unsafe {
                let ns_win = raw_ptr as *mut Object;
                let sharing_type: usize = msg_send![ns_win, sharingType];
                sharing_type == NS_WINDOW_SHARING_NONE
            },
            Err(_) => false,
        };
        let _ = tx.send(safe);
    });

    if let Err(e) = dispatched {
        log::error!("[MYLO macOS] Could not query stream safety: {e}");
        return false;
    }

    // If the main thread is wedged, report "not safe" rather than blocking the
    // overlay forever. Failing closed is the right default for this signal.
    rx.recv_timeout(Duration::from_millis(500)).unwrap_or(false)
}

// ── Non-macOS stubs ─────────────────────────────────────────────────────────

#[cfg(not(target_os = "macos"))]
pub fn setup_overlay(_window: &tauri::WebviewWindow) {}

#[cfg(not(target_os = "macos"))]
pub fn reassert_stream_safety(_window: &tauri::WebviewWindow) {}

#[cfg(not(target_os = "macos"))]
pub fn is_stream_safe(_window: &tauri::WebviewWindow) -> bool {
    false
}
