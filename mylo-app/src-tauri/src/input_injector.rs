//! OS-level input injection for Do Mode.
//!
//! Backed by `enigo`, which wraps `SendInput` on Windows and `CGEvent` on
//! macOS. Requires Accessibility permission on macOS; without it enigo
//! silently does nothing, so the caller checks first.
//!
//! ## Coordinate contract
//!
//! `x`/`y` are **global desktop coordinates in physical pixels** — the same
//! space `screen_capture` uses and the same space `enigo`'s
//! `Coordinate::Abs` expects. The model does not see this space: it sees a
//! cropped, downscaled JPEG. Translating a point the model picks inside that
//! crop back into desktop space is the caller's job (`ipc::execute_do_action`),
//! and getting it wrong means clicking somewhere arbitrary on the user's
//! screen. Every coordinate is therefore bounds-checked against the real
//! desktop before it reaches the OS.

use serde::{Deserialize, Serialize};

/// Longest string Do Mode will type in one action. Typing is not undoable and
/// goes wherever focus happens to be, so an unbounded string from a model is a
/// genuine hazard.
pub const MAX_TYPE_LEN: usize = 500;

/// Largest single scroll, in notches.
const MAX_SCROLL: i32 = 25;

/// The rectangle covering every display, used for bounds checks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopBounds {
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

impl DesktopBounds {
    pub fn contains(&self, x: i32, y: i32) -> bool {
        x >= self.left && x < self.right && y >= self.top && y < self.bottom
    }
}

/// A single action proposed by the model and approved by the user.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DoAction {
    /// One of: `click`, `doubleClick`, `rightClick`, `move`, `type`, `scroll`.
    pub action_type: String,
    /// Global desktop X in physical pixels.
    pub x: Option<i32>,
    /// Global desktop Y in physical pixels.
    pub y: Option<i32>,
    /// Ratio of X coordinate within the cropped image (0.0 to 1.0)
    #[serde(rename = "ratioX")]
    pub ratio_x: Option<f64>,
    /// Ratio of Y coordinate within the cropped image (0.0 to 1.0)
    #[serde(rename = "ratioY")]
    pub ratio_y: Option<f64>,
    /// Text to type, for `type`.
    pub text: Option<String>,
    /// Scroll distance in notches. Positive scrolls down.
    ///
    /// This is deliberately *not* `y`: an earlier version reused the `y`
    /// coordinate as the scroll delta, so "scroll at the point 900px down the
    /// screen" was executed as "scroll 900 notches".
    pub scroll_amount: Option<i32>,
    /// Human-readable summary shown in the approval gate.
    pub description: String,
}

/// Reject anything malformed, out of bounds, or oversized *before* touching
/// the OS. Returns a message suitable for showing to the user.
pub fn validate(action: &DoAction, bounds: DesktopBounds) -> Result<(), String> {
    if action.description.trim().is_empty() {
        return Err("Action is missing a description and cannot be approved".to_string());
    }
    if action.description.len() > 400 {
        return Err("Action description is implausibly long".to_string());
    }

    let needs_point = matches!(
        action.action_type.as_str(),
        "click" | "doubleClick" | "rightClick" | "move"
    );

    if needs_point {
        let (Some(x), Some(y)) = (action.x, action.y) else {
            return Err(format!("'{}' requires x and y coordinates", action.action_type));
        };
        if !bounds.contains(x, y) {
            return Err(format!(
                "Target ({x}, {y}) is outside the desktop \
                 ({}, {}) to ({}, {}). Refusing to move the cursor there.",
                bounds.left, bounds.top, bounds.right, bounds.bottom
            ));
        }
    }

    match action.action_type.as_str() {
        "type" => {
            let text = action.text.as_deref().unwrap_or("");
            if text.is_empty() {
                return Err("'type' requires text".to_string());
            }
            if text.chars().count() > MAX_TYPE_LEN {
                return Err(format!(
                    "Refusing to type {} characters (limit {MAX_TYPE_LEN})",
                    text.chars().count()
                ));
            }
        }
        "scroll" => {
            let amount = action.scroll_amount.unwrap_or(0);
            if amount == 0 {
                return Err("'scroll' requires a non-zero scrollAmount".to_string());
            }
            if amount.abs() > MAX_SCROLL {
                return Err(format!(
                    "Scroll of {amount} notches exceeds the limit of {MAX_SCROLL}"
                ));
            }
        }
        "click" | "doubleClick" | "rightClick" | "move" => {}
        other => return Err(format!("Unknown action type '{other}'")),
    }

    Ok(())
}

/// Execute a **previously validated** action.
pub fn execute_action(action: &DoAction, bounds: DesktopBounds) -> Result<(), String> {
    use enigo::{
        Axis, Button,
        Coordinate::Abs,
        Direction::Click,
        Enigo, Keyboard, Mouse, Settings,
    };

    // Validate again here rather than trusting the caller. This function is
    // the last line of defence before synthetic input hits the OS.
    validate(action, bounds)?;

    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| {
        format!(
            "Could not access the input system: {e}. \
             On macOS, grant Accessibility permission in \
             System Settings › Privacy & Security › Accessibility."
        )
    })?;

    let point = || -> Result<(i32, i32), String> {
        Ok((
            action.x.ok_or("missing x")?,
            action.y.ok_or("missing y")?,
        ))
    };

    match action.action_type.as_str() {
        "click" | "doubleClick" | "rightClick" => {
            let (x, y) = point()?;
            enigo.move_mouse(x, y, Abs).map_err(|e| e.to_string())?;

            let button = if action.action_type == "rightClick" {
                Button::Right
            } else {
                Button::Left
            };
            enigo.button(button, Click).map_err(|e| e.to_string())?;

            if action.action_type == "doubleClick" {
                enigo.button(button, Click).map_err(|e| e.to_string())?;
            }
        }
        "move" => {
            let (x, y) = point()?;
            enigo.move_mouse(x, y, Abs).map_err(|e| e.to_string())?;
        }
        "type" => {
            let text = action.text.as_deref().ok_or("missing text")?;
            enigo.text(text).map_err(|e| e.to_string())?;
        }
        "scroll" => {
            // If a point was supplied, move there first so the scroll lands on
            // the intended surface rather than wherever the cursor happens to
            // be sitting.
            if let (Some(x), Some(y)) = (action.x, action.y) {
                if bounds.contains(x, y) {
                    enigo.move_mouse(x, y, Abs).map_err(|e| e.to_string())?;
                }
            }
            let amount = action.scroll_amount.ok_or("missing scrollAmount")?;
            enigo.scroll(amount, Axis::Vertical).map_err(|e| e.to_string())?;
        }
        other => return Err(format!("Unknown action type '{other}'")),
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const BOUNDS: DesktopBounds = DesktopBounds { left: 0, top: 0, right: 1920, bottom: 1080 };

    fn action(kind: &str) -> DoAction {
        DoAction {
            action_type: kind.to_string(),
            x: Some(100),
            y: Some(100),
            text: None,
            scroll_amount: None,
            description: "test action".to_string(),
        }
    }

    #[test]
    fn in_bounds_click_is_accepted() {
        assert!(validate(&action("click"), BOUNDS).is_ok());
    }

    #[test]
    fn out_of_bounds_click_is_rejected() {
        let mut a = action("click");
        a.x = Some(9999);
        assert!(validate(&a, BOUNDS).is_err());

        let mut a = action("click");
        a.y = Some(-40);
        assert!(validate(&a, BOUNDS).is_err());
    }

    #[test]
    fn negative_origin_desktops_are_supported() {
        // A second monitor to the left of the primary gives negative coords.
        let bounds = DesktopBounds { left: -1920, top: 0, right: 1920, bottom: 1080 };
        let mut a = action("click");
        a.x = Some(-800);
        assert!(validate(&a, bounds).is_ok());
    }

    #[test]
    fn click_without_coordinates_is_rejected() {
        let mut a = action("click");
        a.x = None;
        assert!(validate(&a, BOUNDS).is_err());
    }

    #[test]
    fn oversized_type_is_rejected() {
        let mut a = action("type");
        a.text = Some("x".repeat(MAX_TYPE_LEN + 1));
        assert!(validate(&a, BOUNDS).is_err());

        a.text = Some("x".repeat(MAX_TYPE_LEN));
        assert!(validate(&a, BOUNDS).is_ok());
    }

    #[test]
    fn empty_type_is_rejected() {
        let mut a = action("type");
        a.text = Some(String::new());
        assert!(validate(&a, BOUNDS).is_err());
    }

    #[test]
    fn scroll_uses_its_own_field_not_the_y_coordinate() {
        let mut a = action("scroll");
        // y = 100 must NOT be interpreted as 100 notches of scrolling.
        a.scroll_amount = None;
        assert!(validate(&a, BOUNDS).is_err(), "scroll must require scrollAmount");

        a.scroll_amount = Some(3);
        assert!(validate(&a, BOUNDS).is_ok());
    }

    #[test]
    fn runaway_scroll_is_rejected() {
        let mut a = action("scroll");
        a.scroll_amount = Some(5000);
        assert!(validate(&a, BOUNDS).is_err());
    }

    #[test]
    fn unknown_action_types_are_rejected() {
        assert!(validate(&action("rm -rf"), BOUNDS).is_err());
    }

    #[test]
    fn description_is_required() {
        let mut a = action("click");
        a.description = "  ".to_string();
        assert!(validate(&a, BOUNDS).is_err());
    }

    #[test]
    fn bounds_are_half_open() {
        assert!(BOUNDS.contains(0, 0));
        assert!(!BOUNDS.contains(1920, 0));
        assert!(!BOUNDS.contains(0, 1080));
    }
}
