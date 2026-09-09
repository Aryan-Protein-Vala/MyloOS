use keyring::Entry;
use tauri::AppHandle;

pub const SUPPORTED_PROVIDERS: [&str; 5] = ["gemini", "openai", "groq", "sarvam", "anthropic"];

fn normalize_provider(provider: &str) -> String {
    provider.trim().to_lowercase()
}

pub fn save_key(_app: &AppHandle, provider: &str, key: &str) -> Result<(), String> {
    let p = normalize_provider(provider);
    let entry = Entry::new("mylo_app_keys", &p).map_err(|e| e.to_string())?;
    entry.set_password(key.trim()).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_key(_app: &AppHandle, provider: &str) -> Option<String> {
    let p = normalize_provider(provider);

    // 1. Try keyring
    if let Ok(entry) = Entry::new("mylo_app_keys", &p) {
        if let Ok(pwd) = entry.get_password() {
            if !pwd.trim().is_empty() {
                return Some(pwd.trim().to_string());
            }
        }
    }

    // 2. Fallback to standard environment variables
    let env_var = format!("{}_API_KEY", p.to_uppercase());
    if let Ok(val) = std::env::var(&env_var) {
        if !val.trim().is_empty() {
            return Some(val.trim().to_string());
        }
    }

    None
}

pub fn save_active_provider(_app: &AppHandle, provider: &str) -> Result<(), String> {
    let p = normalize_provider(provider);
    let entry = Entry::new("mylo_app_config", "active_provider").map_err(|e| e.to_string())?;
    entry.set_password(&p).map_err(|e| e.to_string())?;
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

pub fn delete_key(_app: &AppHandle, provider: &str) -> Result<(), String> {
    let p = normalize_provider(provider);
    let entry = Entry::new("mylo_app_keys", &p).map_err(|e| e.to_string())?;
    let _ = entry.delete_credential(); // Ignore if it doesn't exist
    Ok(())
}

pub fn save_license_key(_app: &AppHandle, key: &str) -> Result<(), String> {
    let entry = Entry::new("mylo_app_config", "license_key").map_err(|e| e.to_string())?;
    entry.set_password(key.trim()).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn get_license_key(_app: &AppHandle) -> Option<String> {
    if let Ok(entry) = Entry::new("mylo_app_config", "license_key") {
        if let Ok(pwd) = entry.get_password() {
            if !pwd.trim().is_empty() {
                return Some(pwd.trim().to_string());
            }
        }
    }
    None
}

pub fn stored_providers(_app: &AppHandle) -> Vec<String> {
    let mut providers = Vec::new();
    for p in SUPPORTED_PROVIDERS {
        if get_key(_app, p).is_some() {
            providers.push(p.to_string());
        }
    }
    providers
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supported_providers_contains_expected() {
        assert!(SUPPORTED_PROVIDERS.contains(&"gemini"));
        assert!(SUPPORTED_PROVIDERS.contains(&"openai"));
        assert!(SUPPORTED_PROVIDERS.contains(&"groq"));
        assert!(SUPPORTED_PROVIDERS.contains(&"sarvam"));
        assert!(SUPPORTED_PROVIDERS.contains(&"anthropic"));
        assert_eq!(SUPPORTED_PROVIDERS.len(), 5);
    }

    #[test]
    fn provider_normalization() {
        assert_eq!(normalize_provider("  GEMINI  "), "gemini");
        assert_eq!(normalize_provider("OpenAI"), "openai");
        assert_eq!(normalize_provider("groq\n"), "groq");
    }
}
