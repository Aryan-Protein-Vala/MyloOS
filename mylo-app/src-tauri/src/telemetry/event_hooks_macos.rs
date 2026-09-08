#[cfg(target_os = "macos")]
pub fn init_event_hooks(_app: tauri::AppHandle) {
    // TODO: Implement actual CGEventTap and NSWorkspace.shared.notificationCenter
    // For now, we rely on the polling telemetry loop that is already running in mod.rs
    log::info!("[MYLO Telemetry] macOS native event hooks (CGEventTap / NSWorkspace) initialized (stub).");
}
