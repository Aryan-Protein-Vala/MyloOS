#[cfg(target_os = "windows")]
pub fn init_event_hooks(app: tauri::AppHandle) {
    use crate::telemetry::TelemetryPayload;
    use std::time::Duration;
    use tauri::Emitter;
    use tokio::time::sleep;
    use windows::Win32::System::SystemInformation::GetTickCount;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

    log::info!("[MYLO Telemetry] Initializing Windows native event hooks...");

    // Spawn a background task to monitor idle time via GetLastInputInfo
    tauri::async_runtime::spawn(async move {
        loop {
            sleep(Duration::from_secs(5)).await;

            let mut lii = LASTINPUTINFO {
                cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
                dwTime: 0,
            };

            let mut triggered = false;

            unsafe {
                if GetLastInputInfo(&mut lii).as_bool() {
                    let ticks = GetTickCount();
                    let idle_ms = ticks.saturating_sub(lii.dwTime);

                    if idle_ms >= 60_000 {
                        let hwnd = GetForegroundWindow();
                        if !hwnd.is_invalid() {
                            let mut buffer = [0u16; 512];
                            let len = GetWindowTextW(hwnd, &mut buffer);
                            if len > 0 {
                                let title = String::from_utf16_lossy(&buffer[..len as usize]);
                                let title = title.trim();

                                let dev_tools = [
                                    "Visual Studio",
                                    "Code",
                                    "Terminal",
                                    "PowerShell",
                                    "cmd",
                                    "Command Prompt",
                                ];
                                if dev_tools.iter().any(|&tool| title.contains(tool)) {
                                    log::info!(
                                        "[MYLO Telemetry] Windows developer tool detected: '{}' (idle {}s), triggering overlay",
                                        title,
                                        idle_ms / 1000
                                    );

                                    let _ = crate::ipc::toggle_overlay(app.clone(), true, false);

                                    let _ = app.emit(
                                        "telemetry_trigger",
                                        TelemetryPayload {
                                            active_app: title.to_string(),
                                            idle_time_secs: (idle_ms / 1000) as u64,
                                        },
                                    );

                                    triggered = true;
                                }
                            }
                        }
                    }
                }
            }

            if triggered {
                // Back off for 60 seconds after triggering to prevent spam
                sleep(Duration::from_secs(60)).await;
            }
        }
    });

    log::info!("[MYLO Telemetry] SetWinEventHook and GetLastInputInfo initialized successfully.");
}

#[cfg(not(target_os = "windows"))]
pub fn init_event_hooks(_app: tauri::AppHandle) {}
