pub mod macos;
pub mod windows;

pub fn snap_to_element(x: i32, y: i32) -> Option<(i32, i32)> {
    let snapped = {
        #[cfg(target_os = "macos")]
        {
            macos::snap_to_element(x, y)
        }

        #[cfg(target_os = "windows")]
        {
            windows::snap_to_element(x, y)
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            None
        }
    };

    if let Some((sx, sy)) = snapped {
        let dx = (sx - x) as f64;
        let dy = (sy - y) as f64;
        let dist = (dx * dx + dy * dy).sqrt();
        if dist <= 200.0 {
            return Some((sx, sy));
        } else {
            log::warn!("Snap distance too large ({}px), ignoring snap", dist);
        }
    }
    None
}
