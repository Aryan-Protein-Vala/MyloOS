//! Secure credential storage backed by the OS credential store.
//!
//! macOS   → Keychain            (keyring feature `apple-native`)
//! Windows → Credential Manager  (keyring feature `windows-native`)
//!
//! **The feature flags in Cargo.toml are load-bearing.** `keyring` ships with
//! *no* default features; without an explicit backend it silently substitutes
//! an in-memory mock store, so every write appears to succeed and every value
//! disappears when the process exits. If keys stop persisting across restarts,
//! check the feature flags before anything else.

use keyring::Entry;

/// Service name under which MYLO's credentials are filed in the OS store.
/// Changing this orphans every previously saved key.
const SERVICE: &str = "com.myloos.app";

/// Providers we are willing to store credentials for. Anything else is
/// rejected so a compromised renderer cannot enumerate or squat arbitrary
/// entries in the user's keychain.
pub const SUPPORTED_PROVIDERS: [&str; 2] = ["gemini", "openai"];

/// Longest credential we will accept. Real keys are well under 200 chars;
/// this only exists to stop a runaway renderer writing megabytes to the
/// keychain.
const MAX_KEY_LEN: usize = 512;

fn validate_provider(provider: &str) -> Result<(), String> {
    if SUPPORTED_PROVIDERS.contains(&provider) {
        Ok(())
    } else {
        Err(format!("Unknown provider '{provider}'"))
    }
}

fn entry(provider: &str) -> Result<Entry, String> {
    validate_provider(provider)?;
    Entry::new(SERVICE, provider).map_err(|e| format!("Could not open the OS credential store: {e}"))
}

/// Persist an API key. Returns a human-readable error the UI can surface —
/// a failed save must never look like a successful one.
pub fn save_key(provider: &str, key: &str) -> Result<(), String> {
    let key = key.trim();

    if key.is_empty() {
        return Err("API key is empty".to_string());
    }
    if key.len() > MAX_KEY_LEN {
        return Err(format!("API key is too long (max {MAX_KEY_LEN} characters)"));
    }
    // Keys are opaque ASCII tokens. Control characters mean the value was
    // pasted with a newline or is not a key at all.
    if key.chars().any(|c| c.is_control()) {
        return Err("API key contains invalid characters".to_string());
    }

    entry(provider)?
        .set_password(key)
        .map_err(|e| format!("Could not save the key to the OS credential store: {e}"))
}

/// Read an API key. `Ok(None)` means "no key stored", which is a normal state;
/// `Err` means the credential store itself failed.
pub fn get_key(provider: &str) -> Result<Option<String>, String> {
    match entry(provider)?.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Could not read from the OS credential store: {e}")),
    }
}

/// Remove a stored key. Deleting a key that was never stored is a no-op.
pub fn delete_key(provider: &str) -> Result<(), String> {
    match entry(provider)?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("Could not delete the key: {e}")),
    }
}

/// Which providers currently have a key stored. Used by the dashboard to show
/// saved state without ever sending the secrets themselves to the renderer.
pub fn stored_providers() -> Vec<String> {
    SUPPORTED_PROVIDERS
        .iter()
        .filter(|p| matches!(get_key(p), Ok(Some(_))))
        .map(|p| (*p).to_string())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_providers_are_rejected() {
        assert!(validate_provider("gemini").is_ok());
        assert!(validate_provider("openai").is_ok());
        assert!(validate_provider("../../etc/passwd").is_err());
        assert!(validate_provider("").is_err());
    }

    #[test]
    fn empty_and_oversized_keys_are_rejected() {
        assert!(save_key("gemini", "   ").is_err());
        assert!(save_key("gemini", &"a".repeat(MAX_KEY_LEN + 1)).is_err());
    }

    #[test]
    fn control_characters_are_rejected() {
        assert!(save_key("gemini", "abc\ndef").is_err());
    }
}
