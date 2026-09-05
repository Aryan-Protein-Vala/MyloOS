use tauri::AppHandle;
use keyring::Entry;

pub fn save_key(_app: &AppHandle, provider: &str, key: &str) {
    if let Ok(entry) = Entry::new("mylo_app_keys", provider) {
        if let Err(e) = entry.set_password(key) {
            eprintln!("[MYLO storage] Failed to save secure key: {}", e);
        }
    }
}

pub fn get_key(_app: &AppHandle, provider: &str) -> Option<String> {
    let entry = Entry::new("mylo_app_keys", provider).ok()?;
    entry.get_password().ok()
}
