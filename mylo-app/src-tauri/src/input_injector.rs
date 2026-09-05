/// Real OS-level input injection for Do Mode.
/// Uses enigo for cross-platform support (Windows + macOS).
/// On Windows, enigo wraps SendInput internally.

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct DoAction {
    /// "click", "move", "type", "scroll"
    pub action_type: String,
    /// Physical screen X coordinate (DPI-scaled by frontend before sending)
    pub x: Option<i32>,
    /// Physical screen Y coordinate (DPI-scaled by frontend before sending)
    pub y: Option<i32>,
    /// Text to type (for action_type == "type")
    pub text: Option<String>,
    /// Human-readable label shown in the approve UI
    pub description: String,
}

pub fn execute_action(action: &DoAction) -> Result<(), String> {
    use enigo::{
        Button, Coordinate,
        Direction::Click,
        Enigo, Keyboard, Mouse, Settings,
    };

    let mut enigo = Enigo::new(&Settings::default())
        .map_err(|e| format!("Failed to init enigo: {}", e))?;

    match action.action_type.as_str() {
        "click" => {
            let x = action.x.ok_or("click requires x")?;
            let y = action.y.ok_or("click requires y")?;
            enigo
                .move_mouse(x, y, Coordinate::Abs)
                .map_err(|e| e.to_string())?;
            enigo
                .button(Button::Left, Click)
                .map_err(|e| e.to_string())?;
        }
        "move" => {
            let x = action.x.ok_or("move requires x")?;
            let y = action.y.ok_or("move requires y")?;
            enigo
                .move_mouse(x, y, Coordinate::Abs)
                .map_err(|e| e.to_string())?;
        }
        "type" => {
            if let (Some(x), Some(y)) = (action.x, action.y) {
                enigo
                    .move_mouse(x, y, Coordinate::Abs)
                    .map_err(|e| e.to_string())?;
                enigo
                    .button(Button::Left, Click)
                    .map_err(|e| e.to_string())?;
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            let text = action.text.as_deref().ok_or("type requires text")?;
            enigo.text(text).map_err(|e| e.to_string())?;
        }
        "scroll" => {
            let y = action.y.unwrap_or(-3).clamp(-30, 30);
            enigo
                .scroll(y, enigo::Axis::Vertical)
                .map_err(|e| e.to_string())?;
        }
        unknown => return Err(format!("Unknown action type: {}", unknown)),
    }

    Ok(())
}
