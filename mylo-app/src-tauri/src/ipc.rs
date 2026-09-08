//! Commands exposed to the frontend.
//!
//! Two invariants are enforced here and nowhere else:
//!
//! 1. **Coordinate translation.** The renderer only ever knows CSS pixels
//!    relative to the overlay window. Everything below this layer works in
//!    global desktop physical pixels. The conversion happens once, in
//!    `to_global_rect`, using the window's real position and scale factor —
//!    not `window.devicePixelRatio`, which is wrong the moment the overlay
//!    sits on a secondary display with a different scale.
//!
//! 2. **Input injection is gated.** `execute_do_action` refuses to run unless
//!    `approve_do_action` armed it first, and re-validates the action against
//!    the real desktop bounds even then.

use serde::{Serialize, Deserialize};
use tauri::{command, AppHandle, Manager, WebviewWindow};

use crate::input_injector::{DesktopBounds, DoAction};
use crate::state::{AppState, OverlayMode};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn overlay(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window("overlay")
        .ok_or_else(|| "Overlay window is not available".to_string())
}

/// Re-assert Windows' capture exclusion.
///
/// Some GPU drivers drop `WDA_EXCLUDEFROMCAPTURE` when the window's extended
/// styles change, which is exactly what toggling click-through does. Cheap to
/// re-apply, catastrophic to miss.
#[cfg(target_os = "windows")]
fn reassert_wda(window: &WebviewWindow) {
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

fn reassert_stream_safety(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    reassert_wda(window);

    #[cfg(target_os = "macos")]
    crate::platform_macos::reassert_stream_safety(window);

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let _ = window;
}

/// The bounding box of every display, in physical pixels.
///
/// Monitors left of or above the primary produce negative coordinates, so this
/// is not simply `(0, 0, width, height)`.
fn desktop_bounds(app: &AppHandle) -> Result<DesktopBounds, String> {
    let monitors = app
        .available_monitors()
        .map_err(|e| format!("Could not enumerate displays: {e}"))?;

    if monitors.is_empty() {
        return Err("No displays detected".to_string());
    }

    let mut bounds = DesktopBounds {
        left: i32::MAX,
        top: i32::MAX,
        right: i32::MIN,
        bottom: i32::MIN,
    };

    for m in monitors {
        #[cfg(target_os = "macos")]
        {
            let scale = m.scale_factor();
            let pos = m.position().to_logical::<f64>(scale);
            let size = m.size().to_logical::<f64>(scale);
            bounds.left = bounds.left.min(pos.x.round() as i32);
            bounds.top = bounds.top.min(pos.y.round() as i32);
            bounds.right = bounds.right.max((pos.x + size.width).round() as i32);
            bounds.bottom = bounds.bottom.max((pos.y + size.height).round() as i32);
        }
        #[cfg(not(target_os = "macos"))]
        {
            let pos = m.position();
            let size = m.size();
            bounds.left = bounds.left.min(pos.x);
            bounds.top = bounds.top.min(pos.y);
            bounds.right = bounds.right.max(pos.x + size.width as i32);
            bounds.bottom = bounds.bottom.max(pos.y + size.height as i32);
        }
    }

    Ok(bounds)
}

/// Move and size the overlay so it exactly covers the display the cursor is on.
///
/// This replaces `"fullscreen": true` in the window config, which on macOS
/// promotes the window into its own Space — so triggering the overlay would
/// animate the user out of whatever they were looking at. Sizing to the active
/// monitor also gives multi-monitor support for free: `to_global_rect` derives
/// desktop coordinates from the window's real position, so the crop follows the
/// overlay wherever it went.
pub fn position_overlay_on_active_monitor(app: &AppHandle) -> Result<(), String> {
    let window = overlay(app)?;

    let monitor = app
        .cursor_position()
        .ok()
        .and_then(|cursor| app.monitor_from_point(cursor.x, cursor.y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or_else(|| "No display available to place the overlay on".to_string())?;

    let position = *monitor.position();
    let size = *monitor.size();

    window
        .set_position(tauri::PhysicalPosition::new(position.x, position.y))
        .map_err(|e| format!("Could not move the overlay: {e}"))?;
    window
        .set_size(tauri::PhysicalSize::new(size.width, size.height))
        .map_err(|e| format!("Could not resize the overlay: {e}"))?;

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlay window control
// ─────────────────────────────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone)]
pub struct PermissionsPayload {
    pub accessibility: bool,
    pub screen_recording: bool,
}

#[tauri::command]
pub fn check_permissions() -> PermissionsPayload {
    PermissionsPayload {
        accessibility: crate::platform_macos::check_accessibility_permission(),
        screen_recording: crate::platform_macos::check_screen_recording_permission(),
    }
}

#[tauri::command]
pub fn request_accessibility_permissions() -> bool {
    crate::platform_macos::request_accessibility_permission()
}

#[tauri::command]
pub fn request_screen_recording_permissions() -> bool {
    crate::platform_macos::request_screen_recording_permission()
}

#[tauri::command]
pub fn toggle_overlay(app_handle: AppHandle, visible: bool, click_through: bool) -> Result<(), String> {
    let window = overlay(&app_handle)?;
    let state = app_handle.state::<AppState>();

    if visible {
        let _ = position_overlay_on_active_monitor(&app_handle);
        window.show().map_err(|e| e.to_string())?;
    } else {
        state.set_mode(OverlayMode::Hidden);
        state.disarm();
        *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner()) = None;
        // Always restore click-through before hiding, so a later show() can
        // never come back up swallowing every click on the desktop.
        let _ = window.set_ignore_cursor_events(true);
        window.hide().map_err(|e| e.to_string())?;
    }

    let _ = window.set_ignore_cursor_events(click_through);
    reassert_stream_safety(&window);
    Ok(())
}

/// Turn OS-level click-through on or off.
///
/// CSS `pointer-events` cannot do this: it only routes events *within* the
/// webview. While the window is interactive it swallows every click over its
/// whole area, so the frontend must only request it when the user genuinely
/// needs to interact with the overlay.
#[command]
pub fn set_overlay_interactive(app_handle: AppHandle, interactive: bool) -> Result<(), String> {
    let window = overlay(&app_handle)?;
    window
        .set_ignore_cursor_events(!interactive)
        .map_err(|e| e.to_string())?;

    // Focus is taken only here — when the user is deliberately interacting
    // with the overlay — and never merely because it became visible.
    if interactive {
        let _ = window.set_focus();
    }

    reassert_stream_safety(&window);
    Ok(())
}

#[command]
pub fn set_overlay_mode(app_handle: AppHandle, mode: String) -> Result<(), String> {
    let parsed = match mode.as_str() {
        "hidden" => OverlayMode::Hidden,
        "ask" => OverlayMode::Ask,
        "do" => OverlayMode::Do,
        "coach" => OverlayMode::Coach,
        "agent" => OverlayMode::Agent,
        other => return Err(format!("Unknown overlay mode '{other}'")),
    };
    app_handle.state::<AppState>().set_mode(parsed);
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Shortcuts and platform info
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct ShortcutInfo {
    pub action: String,
    pub label: String,
    pub description: String,
}

/// The shortcuts that are *actually registered*.
///
/// The dashboard renders this list rather than hardcoding key names, so the UI
/// can never advertise a combination that isn't bound.
#[command]
pub fn get_shortcuts() -> Vec<ShortcutInfo> {
    crate::hotkey::bindings()
        .into_iter()
        .map(|b| ShortcutInfo {
            action: b.action.to_string(),
            label: b.label(),
            description: b.description.to_string(),
        })
        .collect()
}

/// Report the host OS from the backend.
///
/// The frontend is a static export, so `navigator.userAgent` there is
/// evaluated by Node at build time and bakes in the wrong answer.
#[command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

// ─────────────────────────────────────────────────────────────────────────────
// API key storage
// ─────────────────────────────────────────────────────────────────────────────

/// Returns `Err` when the key could not be stored, so the UI can stop claiming
/// success on failure.
#[command]
pub fn save_api_key(app_handle: AppHandle, provider: String, key: String) -> Result<(), String> {
    let norm = provider.trim().to_lowercase();
    if !crate::storage::SUPPORTED_PROVIDERS.contains(&norm.as_str()) {
        return Err(format!(
            "Unsupported provider '{}'. Supported providers: {}",
            provider,
            crate::storage::SUPPORTED_PROVIDERS.join(", ")
        ));
    }
    crate::storage::save_key(&app_handle, &provider, &key)
}

#[command]
pub fn get_api_key(app_handle: AppHandle, provider: String) -> Result<Option<String>, String> {
    if provider == "openai" || provider == "gemini" {
        return Err("Reasoning API keys are restricted to backend execution".into());
    }
    if provider != "groq" && provider != "sarvam" {
        return Err("Access to this API key is restricted".into());
    }
    Ok(crate::storage::get_key(&app_handle, &provider))
}

#[command]
pub fn delete_api_key(app_handle: AppHandle, provider: String) -> Result<(), String> {
    crate::storage::delete_key(&app_handle, &provider)
}

/// Which providers have a key stored, without revealing the keys themselves.
#[command]
pub fn list_saved_providers(app_handle: AppHandle) -> Vec<String> {
    crate::storage::stored_providers(&app_handle)
}

#[command]
pub fn set_active_provider(app_handle: AppHandle, provider: String) -> Result<(), String> {
    crate::storage::save_active_provider(&app_handle, &provider)
}

#[command]
pub fn get_active_provider(app_handle: AppHandle) -> String {
    crate::storage::get_active_provider(&app_handle)
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen capture
// ─────────────────────────────────────────────────────────────────────────────

/// A rectangle in global desktop physical pixels.
#[derive(Serialize, Deserialize, Clone, Copy, Debug)]
pub struct GlobalRect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Serialize)]
pub struct CaptureResult {
    /// base64 JPEG, or `None` when there was nothing to capture.
    pub image: Option<String>,
    /// The region that was captured, so the caller can map points inside the
    /// returned image back onto the real desktop.
    pub rect: GlobalRect,
}

/// Convert overlay-relative CSS pixels into desktop coordinates:
/// On macOS, enigo.move_mouse expects logical screen points, so we return logical coordinates.
/// On other platforms, coordinates are in physical pixels.
fn to_global_rect(
    window: &WebviewWindow,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<GlobalRect, String> {
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let origin = window.outer_position().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let origin_logical = origin.to_logical::<f64>(scale);
        Ok(GlobalRect {
            x: (origin_logical.x + x).round() as i32,
            y: (origin_logical.y + y).round() as i32,
            width: width.round().max(0.0) as u32,
            height: height.round().max(0.0) as u32,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(GlobalRect {
            x: origin.x + (x * scale).round() as i32,
            y: origin.y + (y * scale).round() as i32,
            width: (width * scale).round().max(0.0) as u32,
            height: (height * scale).round().max(0.0) as u32,
        })
    }
}

#[command]
pub async fn capture_screen_crop(
    app_handle: AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<CaptureResult, String> {
    let window = overlay(&app_handle)?;
    let rect = to_global_rect(&window, x, y, width, height)?;

    if rect.width == 0 || rect.height == 0 {
        return Ok(CaptureResult { image: None, rect });
    }

    #[cfg(target_os = "macos")]
    let (cap_x, cap_y, cap_w, cap_h) = {
        let scale = window.scale_factor().unwrap_or(1.0);
        (
            (rect.x as f64 * scale).round() as i32,
            (rect.y as f64 * scale).round() as i32,
            (rect.width as f64 * scale).round() as u32,
            (rect.height as f64 * scale).round() as u32,
        )
    };
    #[cfg(not(target_os = "macos"))]
    let (cap_x, cap_y, cap_w, cap_h) = (rect.x, rect.y, rect.width, rect.height);

    let mut image =
        crate::screen_capture::capture_crop_async(cap_x, cap_y, cap_w, cap_h).await?;

    if let Some(img) = image {
        image = Some(crate::security::pii_masking::mask_pii_in_image(&img)?);
    }

    Ok(CaptureResult { image, rect })
}

// ─────────────────────────────────────────────────────────────────────────────
// Stream-safety verification
// ─────────────────────────────────────────────────────────────────────────────

/// Whether the overlay is genuinely excluded from screen capture.
///
/// This is a real read of the window's state on both platforms. The badge it
/// drives tells users it is safe to share their screen, so it must never be
/// optimistic.
#[command]
pub fn verify_stream_safety(app_handle: AppHandle) -> bool {
    let Ok(window) = overlay(&app_handle) else {
        return false;
    };

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE,
        };

        if let Ok(hwnd_ptr) = window.hwnd() {
            let hwnd = HWND(hwnd_ptr.0 as _);
            let mut affinity = 0u32;
            unsafe {
                if GetWindowDisplayAffinity(hwnd, &mut affinity).is_ok() {
                    return affinity == WDA_EXCLUDEFROMCAPTURE.0;
                }
            }
        }
        false
    }

    #[cfg(target_os = "macos")]
    {
        crate::platform_macos::is_stream_safe(&window)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = window;
        false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Do Mode
// ─────────────────────────────────────────────────────────────────────────────

/// Check an action and, if it is sound, arm exactly one execution.
///
/// Called when the user clicks Approve. Splitting arm from execute means a
/// renderer that has been compromised, or a model response that loops, cannot
/// drive the mouse without a real approval having happened first.
#[command]
pub fn approve_do_action(app_handle: AppHandle, action: DoAction) -> Result<(), String> {
    let bounds = desktop_bounds(&app_handle)?;
    crate::input_injector::validate(&action, bounds)?;

    let state = app_handle.state::<AppState>();
    state.arm();

    log::info!("[MYLO do] Armed action: {} — {}", action.action_type, action.description);
    Ok(())
}

/// Execute a previously approved action.
///
/// The overlay must already be hidden by the caller: a synthetic click while a
/// fullscreen window is up lands on the overlay, not on the app underneath.
#[command]
pub fn execute_do_action(app_handle: AppHandle, action: DoAction) -> Result<(), String> {
    let bounds = desktop_bounds(&app_handle)?;

    {
        let state = app_handle.state::<AppState>();
        state.try_consume()?;
    }

    // Refuse to fire while the overlay is still on screen — the click would
    // hit our own window.
    if let Ok(window) = overlay(&app_handle) {
        if window.is_visible().unwrap_or(false) {
            return Err(
                "Overlay is still visible; refusing to inject input that would hit it".to_string(),
            );
        }
    }

    let result = crate::input_injector::execute_action(&action, bounds);

    match &result {
        Ok(()) => log::info!("[MYLO do] Executed: {} — {}", action.action_type, action.description),
        Err(e) => log::error!("[MYLO do] Failed: {} — {e}", action.action_type),
    }

    result
}

/// Cancel a pending approval. Wired to Reject and to the panic hotkey.
#[command]
pub fn cancel_do_action(app_handle: AppHandle) {
    let state = app_handle.state::<AppState>();
    state.disarm();
    *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner()) = None;
}

/// Dismiss the overlay and reset state.
#[command]
pub fn dismiss(app_handle: AppHandle) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner()) = None;
    toggle_overlay(app_handle, false, true)
}

/// Execute an action in an automated Agentic loop without manual approval.
/// Validates desktop bounds, checks panic state, and ensures overlay is click-through.
#[command]
pub fn execute_agentic_action(app_handle: AppHandle, action: DoAction) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    // Pre-execution check: abort immediately if overlay is hidden or panic hotkey was triggered
    if state.mode() == OverlayMode::Hidden {
        return Err("Action aborted: overlay is hidden or panic hotkey was pressed".to_string());
    }

    let bounds = desktop_bounds(&app_handle)?;
    crate::input_injector::validate(&action, bounds)?;

    // Hardware Mouse Fight Detection for single agentic actions
    let prev_pos = *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner());
    if let Some((ex, ey)) = prev_pos {
        use enigo::{Enigo, Mouse};
        if let Ok(enigo) = Enigo::new(&enigo::Settings::default()) {
            if let Ok((actual_x, actual_y)) = enigo.location() {
                if (actual_x - ex).abs() > 15 || (actual_y - ey).abs() > 15 {
                    *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner()) = None;
                    return Err("Agent aborted: detected manual mouse movement. User took control.".into());
                }
            }
        }
    }

    // Programmatically arm and consume the rate-limiter guard
    {
        state.arm();
        state.try_consume()?;
    }

    // Ensure overlay is set to click-through so the input hits the desktop app beneath
    if let Ok(window) = overlay(&app_handle) {
        let _ = window.set_ignore_cursor_events(true);
    }

    // Verify panic mode / overlay hidden state right before execution
    if state.mode() == OverlayMode::Hidden {
        return Err("Action aborted: overlay is hidden or panic hotkey was pressed during execution setup".to_string());
    }
    
    let result = crate::input_injector::execute_action(&action, bounds);

    match &result {
        Ok(()) => {
            log::info!("[MYLO agentic] Executed: {} — {}", action.action_type, action.description);
            // Query actual hardware cursor location to record the true injected coordinates.
            // This prevents false-positive mouse fight aborts if ui_snapper adjusted the target coordinate.
            use enigo::{Enigo, Mouse};
            if let Ok(enigo) = Enigo::new(&enigo::Settings::default()) {
                if let Ok(loc) = enigo.location() {
                    *state.last_synthetic_pos.lock().unwrap_or_else(|p| p.into_inner()) = Some(loc);
                }
            }
        }
        Err(e) => log::error!("[MYLO agentic] Failed: {} — {e}", action.action_type),
    }

    result
}

/// Execute a chain of actions in an automated Agentic loop sequentially.
#[command]
pub fn execute_agentic_chain(app_handle: AppHandle, actions: Vec<DoAction>) -> Result<(), String> {
    let state = app_handle.state::<AppState>();

    for action in actions {
        if state.mode() == OverlayMode::Hidden {
            return Err("Action chain aborted: overlay is hidden or panic hotkey was pressed".to_string());
        }

        execute_agentic_action(app_handle.clone(), action)?;

        std::thread::sleep(std::time::Duration::from_millis(350));
    }
    Ok(())
}

#[derive(Serialize)]
pub struct ActiveAgentPayload {
    pub id: String,
    pub name: String,
    pub status: String,
}

#[command]
pub fn get_active_agents(app_handle: AppHandle) -> Vec<ActiveAgentPayload> {
    let state = app_handle.state::<AppState>();
    let agents = state.active_agents.lock().unwrap_or_else(|p| p.into_inner());
    agents.keys().map(|id| ActiveAgentPayload {
        id: id.clone(),
        name: "Headless Web Agent".into(),
        status: "running".into(),
    }).collect()
}

async fn call_gemini_ask(
    client: &reqwest::Client,
    key: &str,
    system_prompt: &str,
    user_prompt: &str,
    base64_image: &str,
) -> Result<String, String> {
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": format!("{}\n\n{}", system_prompt, user_prompt) },
                { "inline_data": { "mime_type": "image/jpeg", "data": base64_image } }
            ]
        }]
    });

    let resp = client.post(url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Gemini error {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
        return Ok(text.to_string());
    }
    Ok("No response generated.".into())
}

async fn call_openai_ask(
    client: &reqwest::Client,
    key: &str,
    system_prompt: &str,
    user_prompt: &str,
    base64_image: &str,
) -> Result<String, String> {
    let body = serde_json::json!({
        "model": "gpt-4o",
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": format!("{}\n\n{}", system_prompt, user_prompt) },
                { "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{}", base64_image) } }
            ]
        }]
    });

    let resp = client.post("https://api.openai.com/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("OpenAI error {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(text) = json["choices"][0]["message"]["content"].as_str() {
        return Ok(text.to_string());
    }
    Ok("No response generated.".into())
}

#[command]
pub async fn ask_ai(app_handle: tauri::AppHandle, prompt: String, base64_image: String) -> Result<String, String> {
    let active_provider = crate::storage::get_active_provider(&app_handle);
    let gemini_key = crate::storage::get_key(&app_handle, "gemini");
    let openai_key = crate::storage::get_key(&app_handle, "openai");

    if gemini_key.is_none() && openai_key.is_none() {
        return Err("Please configure your Gemini or OpenAI API key in MYLO settings.".into());
    }

    let system_prompt = crate::prompts::ASK_MODE_SYSTEM_PROMPT;
    let user_prompt = format!("User question: {}", if prompt.is_empty() { "What is this?" } else { &prompt });

    let client = reqwest::Client::new();

    let order: [(&str, Option<String>); 2] = if active_provider == "openai" {
        [("openai", openai_key), ("gemini", gemini_key)]
    } else {
        [("gemini", gemini_key), ("openai", openai_key)]
    };

    let mut last_error = String::new();
    for (p, maybe_key) in order {
        if let Some(key) = maybe_key {
            let res = if p == "gemini" {
                call_gemini_ask(&client, &key, system_prompt, &user_prompt, &base64_image).await
            } else {
                call_openai_ask(&client, &key, system_prompt, &user_prompt, &base64_image).await
            };

            match res {
                Ok(text) => {
                    if let Err(e) = crate::db::insert_message(&app_handle, "user", &user_prompt) {
                        log::error!("Failed to persist chat message: {e}");
                    }
                    if let Err(e) = crate::db::insert_message(&app_handle, "assistant", &text) {
                        log::error!("Failed to persist chat message: {e}");
                    }
                    return Ok(text);
                }
                Err(err) => {
                    eprintln!("[MYLO AI ask] Provider {} failed: {}", p, err);
                    last_error = err;
                }
            }
        }
    }

    Err(if last_error.is_empty() {
        "No configured provider available.".into()
    } else {
        format!("All providers failed. Last error: {}", last_error)
    })
}

#[command]
pub fn get_chat_history(app_handle: AppHandle, limit: Option<usize>) -> Result<Vec<crate::db::ChatMessage>, String> {
    crate::db::get_recent_messages(&app_handle, limit.unwrap_or(50)).map_err(|e| e.to_string())
}

async fn call_gemini_do(
    client: &reqwest::Client,
    key: &str,
    system_prompt: &str,
    user_intent: &str,
    base64_image: &str,
) -> Result<Option<crate::input_injector::DoAction>, String> {
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    let body = serde_json::json!({
        "contents": [{
            "parts": [
                { "text": format!("{}\n\nUser intent: \"{}\"", system_prompt, user_intent) },
                { "inline_data": { "mime_type": "image/jpeg", "data": base64_image } }
            ]
        }],
        "generationConfig": { "responseMimeType": "application/json" }
    });

    let resp = client.post(url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", key)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Gemini error {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
        if let Ok(action) = serde_json::from_str::<crate::input_injector::DoAction>(text) {
            if action.action_type == "none" { return Ok(None); }
            return Ok(Some(action));
        }
    }
    Ok(None)
}

async fn call_openai_do(
    client: &reqwest::Client,
    key: &str,
    system_prompt: &str,
    user_intent: &str,
    base64_image: &str,
) -> Result<Option<crate::input_injector::DoAction>, String> {
    let body = serde_json::json!({
        "model": "gpt-4o",
        "response_format": { "type": "json_object" },
        "messages": [{
            "role": "user",
            "content": [
                { "type": "text", "text": format!("{}\n\nUser intent: \"{}\"", system_prompt, user_intent) },
                { "type": "image_url", "image_url": { "url": format!("data:image/jpeg;base64,{}", base64_image) } }
            ]
        }]
    });

    let resp = client.post("https://api.openai.com/v1/chat/completions")
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", key))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("OpenAI error {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    if let Some(text) = json["choices"][0]["message"]["content"].as_str() {
        if let Ok(action) = serde_json::from_str::<crate::input_injector::DoAction>(text) {
            if action.action_type == "none" { return Ok(None); }
            return Ok(Some(action));
        }
    }
    Ok(None)
}

#[command]
pub async fn analyze_for_do_mode(
    app_handle: tauri::AppHandle,
    base64_image: String,
    user_intent: String,
    rect: crate::ipc::GlobalRect,
) -> Result<Option<crate::input_injector::DoAction>, String> {
    let active_provider = crate::storage::get_active_provider(&app_handle);
    let gemini_key = crate::storage::get_key(&app_handle, "gemini");
    let openai_key = crate::storage::get_key(&app_handle, "openai");

    if gemini_key.is_none() && openai_key.is_none() {
        return Ok(None);
    }

    // The key names below are NOT cosmetic: they are the exact field names
    // `DoAction` deserialises, and `DoAction` is `#[serde(rename_all =
    // "camelCase")]`. `actionType` and `description` are non-Option fields, so
    // a snake_case reply makes `serde_json::from_str` fail outright and Do Mode
    // silently reports "couldn't determine a safe action" for every request.
    // If you rename a field on `DoAction`, rename it here too — the round-trip
    // test at the bottom of input_injector.rs exists to catch the drift.
    //
    // Coordinates are requested as ratios in [0,1] relative to the cropped
    // image, never as pixels: the model only ever sees the crop, so it cannot
    // know the crop's offset on the desktop or how far it was downscaled before
    // being sent. The caller converts the ratios back to global physical pixels
    // using the rect that `capture_screen_crop` actually captured.
    let system_prompt = crate::prompts::DO_MODE_SYSTEM_PROMPT;

    let client = reqwest::Client::new();

    let order: [(&str, Option<String>); 2] = if active_provider == "openai" {
        [("openai", openai_key), ("gemini", gemini_key)]
    } else {
        [("gemini", gemini_key), ("openai", openai_key)]
    };

    let mut last_error = String::new();
    let mut raw_action = None;
    
    for (p, maybe_key) in order {
        if let Some(key) = maybe_key {
            let res = if p == "gemini" {
                call_gemini_do(&client, &key, system_prompt, &user_intent, &base64_image).await
            } else {
                call_openai_do(&client, &key, system_prompt, &user_intent, &base64_image).await
            };

            match res {
                Ok(action) => {
                    raw_action = action;
                    break;
                }
                Err(err) => {
                    eprintln!("[MYLO AI do] Provider {} failed: {}", p, err);
                    last_error = err;
                }
            }
        }
    }

    if let Some(mut action) = raw_action {
        // "none" is the model declining, not an action. Report it as "no action
        // available" so the UI shows its friendly message; letting it through
        // would surface `validate`'s "Unknown action type 'none'" in the
        // approval gate, which reads like a crash rather than a refusal.
        if action.action_type == "none" {
            log::info!("[MYLO do] Model declined: {}", action.description);
            return Ok(None);
        }

        // Ratios are relative to the *cropped, possibly downscaled* image the
        // model saw, so they are resolved against `rect` — the region
        // `capture_screen_crop` actually captured, in global physical pixels.
        // Because they are ratios, the downscale factor cancels out and does
        // not need to be tracked separately.
        if let Some(rx) = action.ratio_x {
            action.x = Some(rect.x + (rx * rect.width as f64).round() as i32);
        }
        if let Some(ry) = action.ratio_y {
            action.y = Some(rect.y + (ry * rect.height as f64).round() as i32);
        }
        return Ok(Some(action));
    }

    if !last_error.is_empty() {
        eprintln!("[MYLO AI do] All providers failed: {}", last_error);
    }
    Ok(None)
}

#[derive(serde::Serialize, Clone)]
pub struct AgentStatusPayload {
    pub agent_id: String,
    pub status: String,
}

#[derive(serde::Serialize, Clone)]
pub struct AgentLogPayload {
    pub agent_id: String,
    pub message: String,
}

#[tauri::command]
pub fn kill_headless_agent(
    app_handle: AppHandle,
    agent_id: String,
) -> Result<(), String> {
    use tauri::Emitter;

    let state = app_handle.state::<AppState>();
    let abort_handle = {
        let mut active = state.active_agents.lock().unwrap_or_else(|p| p.into_inner());
        active.remove(&agent_id)
    };

    if let Some(handle) = abort_handle {
        handle.abort();
    }

    let _ = app_handle.emit("agent_status", AgentStatusPayload {
        agent_id: agent_id.clone(),
        status: "killed".to_string(),
    });

    let _ = app_handle.emit("agent_log", AgentLogPayload {
        agent_id,
        message: "[SYSTEM] Agent killed by user.".to_string(),
    });

    Ok(())
}

#[tauri::command]
pub async fn spawn_headless_agent(
    app: tauri::AppHandle,
    agent_id: String,
    task: String,
) -> Result<(), String> {
    let app_clone = app.clone();
    let agent_id_clone = agent_id.clone();
    let (started_tx, started_rx) = tokio::sync::oneshot::channel::<()>();

    let join_handle = tokio::spawn(async move {
        let _ = started_rx.await;

        crate::orchestrator::worker::run_worker_task(app_clone.clone(), agent_id_clone.clone(), task).await;
        
        let state = app_clone.state::<AppState>();
        let mut active = state.active_agents.lock().unwrap_or_else(|p| p.into_inner());
        active.remove(&agent_id_clone);
    });

    let state = app.state::<AppState>();
    let mut active = state.active_agents.lock().unwrap_or_else(|p| p.into_inner());
    active.insert(agent_id, join_handle.abort_handle());
    drop(active);
    let _ = started_tx.send(());

    Ok(())
}
