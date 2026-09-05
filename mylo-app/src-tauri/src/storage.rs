use tauri::AppHandle;
use keyring::Entry;

pub fn save_key(_app: &AppHandle, provider: &str, key: &str) -> Result<(), String> {
    let entry = Entry::new("mylo_app_keys", provider).map_err(|e| e.to_string())?;
    entry.set_password(key).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_key(_app: &AppHandle, provider: &str) -> Option<String> {
    let entry = Entry::new("mylo_app_keys", provider).ok()?;
    entry.get_password().ok()
}

pub fn save_active_provider(_app: &AppHandle, provider: &str) -> Result<(), String> {
    let entry = Entry::new("mylo_app_config", "active_provider").map_err(|e| e.to_string())?;
    entry.set_password(provider).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_active_provider(_app: &AppHandle) -> String {
    if let Ok(entry) = Entry::new("mylo_app_config", "active_provider") {
        if let Ok(pwd) = entry.get_password() {
            if !pwd.is_empty() {
                return pwd;
            }
        }
    }
    "gemini".to_string()
}

