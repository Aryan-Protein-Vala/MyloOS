use tauri::AppHandle;

#[derive(Debug, PartialEq)]
pub enum Tier {
    Free,
    Pro,
    Elite,
}

/// Enforces that the user has at least the required tier.
/// In the real implementation, this should hit an external licensing API if the
/// local cache is expired. For now, it checks the local `storage.rs` license key.
pub fn enforce_tier(app: &AppHandle, required_tier: Tier) -> Result<(), String> {
    let current_tier = get_current_tier(app);

    let required_level = match required_tier {
        Tier::Free => 0,
        Tier::Pro => 1,
        Tier::Elite => 2,
    };

    let current_level = match current_tier {
        Tier::Free => 0,
        Tier::Pro => 1,
        Tier::Elite => 2,
    };

    if current_level >= required_level {
        Ok(())
    } else {
        Err(format!(
            "Access Denied: This feature requires the {:?} tier. Please upgrade your license.",
            required_tier
        ))
    }
}

pub fn get_current_tier(app: &AppHandle) -> Tier {
    if let Some(key) = crate::storage::get_license_key(app) {
        if key.starts_with("pro-") {
            return Tier::Pro;
        } else if key.starts_with("elite-") {
            return Tier::Elite;
        }
    }
    Tier::Free
}
