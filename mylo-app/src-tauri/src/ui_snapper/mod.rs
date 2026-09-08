pub mod macos;
pub mod windows;

pub fn snap_to_element(x: i32, y: i32) -> Option<(i32, i32)> {
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
}
