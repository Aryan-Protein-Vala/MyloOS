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
pub fn save_api_key(app_handle: tauri::AppHandle, provider: String, key: String) -> Result<(), String> {
    crate::storage::save_key(&app_handle, &provider, &key)
}

#[command]
pub fn get_api_key(app_handle: tauri::AppHandle, provider: String) -> Option<String> {
    crate::storage::get_key(&app_handle, &provider)
}

#[command]
pub fn set_active_provider(app_handle: tauri::AppHandle, provider: String) -> Result<(), String> {
    crate::storage::save_active_provider(&app_handle, &provider)
}

#[command]
pub fn get_active_provider(app_handle: tauri::AppHandle) -> String {
    crate::storage::get_active_provider(&app_handle)
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
    if width == 0 || height == 0 {
        return Ok(None);
    }
    // Pass coordinates and scale factor directly to support multi-monitor setups with negative offsets
    crate::screen_capture::capture_crop_async(x, y, width, height, scale_factor).await
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

    #[cfg(target_os = "macos")]
    {
        if let Some(window) = app_handle.get_webview_window("overlay") {
            return crate::platform_macos::is_stream_safe(&window);
        }
        false
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = app_handle;
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

// ─────────────────────────────────────────────────────────────
// Secure AI client logic (prevents keys from leaking to frontend)
// ─────────────────────────────────────────────────────────────

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
        return Ok("Error: Please set your Gemini or OpenAI API key in MYLO settings.".into());
    }

    let system_prompt = "You are MYLO, an invisible AI overlay assistant running on the user's desktop.\nYou see a cropped screenshot of what the user circled.\nAnswer concisely (2-4 sentences max). Be direct and useful.";
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
                Ok(text) => return Ok(text),
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
) -> Result<Option<crate::input_injector::DoAction>, String> {
    let active_provider = crate::storage::get_active_provider(&app_handle);
    let gemini_key = crate::storage::get_key(&app_handle, "gemini");
    let openai_key = crate::storage::get_key(&app_handle, "openai");

    if gemini_key.is_none() && openai_key.is_none() {
        return Ok(None);
    }

    let system_prompt = "You are MYLO, an AI that controls a user's computer via approved actions.\nAnalyze the screenshot and the user's intent. Return ONLY a JSON object with this exact shape:\n{\n  \"action_type\": \"click\" | \"move\" | \"type\" | \"scroll\",\n  \"x\": <integer screen X in pixels, or null>,\n  \"y\": <integer screen Y in pixels, or null>,\n  \"text\": <string to type, or null>,\n  \"description\": \"<one sentence: what this action will do>\"\n}\nIf you cannot safely determine an action, return: {\"action_type\":\"none\",\"description\":\"Cannot determine safe action\"}";

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
                call_gemini_do(&client, &key, system_prompt, &user_intent, &base64_image).await
            } else {
                call_openai_do(&client, &key, system_prompt, &user_intent, &base64_image).await
            };

            match res {
                Ok(action) => return Ok(action),
                Err(err) => {
                    eprintln!("[MYLO AI do] Provider {} failed: {}", p, err);
                    last_error = err;
                }
            }
        }
    }

    if !last_error.is_empty() {
        eprintln!("[MYLO AI do] All providers failed: {}", last_error);
    }
    Ok(None)
}
