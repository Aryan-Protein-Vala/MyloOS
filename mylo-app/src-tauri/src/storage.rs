use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "mylo_secure.json";

pub fn save_key(app: &AppHandle, provider: &str, key: &str) {
    match app.store(STORE_FILE) {
        Ok(store) => {
            store.set(provider, serde_json::Value::String(key.to_string()));
            if let Err(e) = store.save() {
                eprintln!("[MYLO storage] Failed to flush store: {}", e);
            }
        }
        Err(e) => eprintln!("[MYLO storage] Failed to open store: {}", e),
    }
}

pub fn get_key(app: &AppHandle, provider: &str) -> Option<String> {
    let store = app.store(STORE_FILE).ok()?;
    let val = store.get(provider)?;
    val.as_str().map(|s| s.to_string())
}
