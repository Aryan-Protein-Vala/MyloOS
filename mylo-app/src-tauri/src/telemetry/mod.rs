use tauri::AppHandle;
#[cfg(target_os = "macos")]
use tauri::Emitter;
#[cfg(target_os = "macos")]
use std::time::Duration;
#[cfg(target_os = "macos")]
use tokio::time::sleep;

pub mod event_hooks_macos;
pub mod event_hooks_windows;

#[derive(serde::Serialize, Clone)]
pub struct TelemetryPayload {
    pub active_app: String,
    pub idle_time_secs: u64,
}

#[cfg(target_os = "windows")]
pub fn start_telemetry(app: AppHandle) {
    event_hooks_windows::init_event_hooks(app.clone());
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn start_telemetry(app: AppHandle) {
    let _ = app;
}

#[cfg(target_os = "macos")]
#[link(name = "CoreGraphics", kind = "framework")]
extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(source_state_id: i32, event_type: u32) -> f64;
}

#[cfg(target_os = "macos")]
fn get_idle_seconds() -> u64 {
    unsafe {
        let secs = CGEventSourceSecondsSinceLastEventType(1, !0);
        if secs < 0.0 {
            0
        } else {
            secs as u64
        }
    }
}

#[cfg(target_os = "macos")]
fn get_frontmost_app_name() -> String {
    use objc::{class, msg_send, runtime::Object, sel, sel_impl, rc::autoreleasepool};

    autoreleasepool(|| unsafe {
        let workspace: *mut Object = msg_send![class!(NSWorkspace), sharedWorkspace];
        if workspace.is_null() {
            return String::new();
        }
        let app: *mut Object = msg_send![workspace, frontmostApplication];
        if app.is_null() {
            return String::new();
        }
        let name: *mut Object = msg_send![app, localizedName];
        if name.is_null() {
            return String::new();
        }
        let utf8_str: *const std::os::raw::c_char = msg_send![name, UTF8String];
        if utf8_str.is_null() {
            return String::new();
        }
        std::ffi::CStr::from_ptr(utf8_str)
            .to_string_lossy()
            .trim()
            .to_string()
    })
}

#[cfg(target_os = "macos")]
pub fn start_telemetry(app: AppHandle) {
    event_hooks_macos::init_event_hooks(app.clone());
    tauri::async_runtime::spawn(async move {
        loop {
            sleep(Duration::from_secs(5)).await;

            let idle_secs = get_idle_seconds();
            let app_name = get_frontmost_app_name();

            // If idle >= 60s and app is a developer environment (VSCode, Cursor, Xcode, etc.)
            if idle_secs >= 60 && matches!(app_name.as_str(), "Code" | "Cursor" | "Xcode" | "iTerm2" | "Terminal") {
                let _ = crate::ipc::toggle_overlay(app.clone(), true, false);

                let _ = app.emit("telemetry_trigger", TelemetryPayload {
                    active_app: app_name.clone(),
                    idle_time_secs: idle_secs,
                });

                // Back off for 60 seconds after triggering to prevent spam
                sleep(Duration::from_secs(60)).await;
            }
        }
    });
}
