//! Cross-platform screen capture.
//!
//! Windows: Windows.Graphics.Capture (WGC) via `windows-capture` 1.5.
//! macOS:   ScreenCaptureKit via `xcap` 0.9.
//!
//! ## Coordinate contract
//!
//! `capture_crop_async` takes **global desktop coordinates in physical pixels**
//! — i.e. the same space `Monitor::position()` reports. The caller (`ipc.rs`)
//! is responsible for translating window-relative logical CSS pixels into this
//! space. Getting this wrong is silent and produces a crop of the wrong region,
//! so the conversion lives in exactly one place.

use base64::{engine::general_purpose, Engine as _};
use std::io::Cursor;

/// Maximum edge length of the image handed to the model. Larger crops are
/// downscaled — bigger images cost more tokens and add latency for no gain.
const MAX_EDGE: u32 = 1024;

/// JPEG quality for the encoded crop. 80 is visually lossless for UI
/// screenshots at roughly a third the size of quality 100.
const JPEG_QUALITY: u8 = 80;

/// Hard ceiling on a single capture. Without this a wedged WGC session or a
/// hung ScreenCaptureKit permission prompt leaves the caller awaiting forever.
const CAPTURE_TIMEOUT_SECS: u64 = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Shared encoding helper
// ─────────────────────────────────────────────────────────────────────────────

/// Downscale if needed, drop alpha, JPEG-encode, base64-encode.
///
/// JPEG has no alpha channel, so the RGBA buffer is flattened to RGB first
/// rather than relying on the encoder to guess what to do with it.
fn encode_crop(cropped: image::RgbaImage) -> Result<String, String> {
    use image::codecs::jpeg::JpegEncoder;
    use image::imageops::FilterType;
    use image::ImageEncoder;

    let (cw, ch) = (cropped.width(), cropped.height());
    if cw == 0 || ch == 0 {
        return Err("Empty crop region".to_string());
    }

    let cropped = if cw > MAX_EDGE || ch > MAX_EDGE {
        let (nw, nh) = if cw >= ch {
            (MAX_EDGE, ((MAX_EDGE as f32 * ch as f32) / cw as f32).round().max(1.0) as u32)
        } else {
            (((MAX_EDGE as f32 * cw as f32) / ch as f32).round().max(1.0) as u32, MAX_EDGE)
        };
        image::imageops::resize(&cropped, nw, nh, FilterType::Triangle)
    } else {
        cropped
    };

    let rgb = image::DynamicImage::ImageRgba8(cropped).into_rgb8();

    let mut buf = Cursor::new(Vec::new());
    JpegEncoder::new_with_quality(&mut buf, JPEG_QUALITY)
        .write_image(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| format!("JPEG encode failed: {e}"))?;

    Ok(general_purpose::STANDARD.encode(buf.into_inner()))
}

/// Intersect the requested crop with the bounds of the captured surface.
/// Returns `None` when the requested region lies entirely off-surface.
fn clamp_crop(
    local_x: i32,
    local_y: i32,
    want_w: u32,
    want_h: u32,
    surface_w: u32,
    surface_h: u32,
) -> Option<(u32, u32, u32, u32)> {
    if surface_w == 0 || surface_h == 0 {
        return None;
    }
    // A negative origin means the selection started off the left/top edge of
    // this display; clip it and shrink the requested size to match.
    let clipped_left = (-local_x).max(0) as u32;
    let clipped_top = (-local_y).max(0) as u32;
    let x = local_x.max(0) as u32;
    let y = local_y.max(0) as u32;

    if x >= surface_w || y >= surface_h {
        return None;
    }

    let w = want_w.saturating_sub(clipped_left).min(surface_w - x);
    let h = want_h.saturating_sub(clipped_top).min(surface_h - y);

    if w == 0 || h == 0 {
        return None;
    }
    Some((x, y, w, h))
}

// ─────────────────────────────────────────────────────────────────────────────
// Windows: WGC capture handler
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod win {
    use super::*;
    use std::ffi::c_void;
    use tokio::sync::oneshot;
    use windows_capture::{
        capture::{Context, GraphicsCaptureApiHandler},
        frame::Frame,
        graphics_capture_api::InternalCaptureControl,
        monitor::Monitor,
        settings::{
            ColorFormat, CursorCaptureSettings, DirtyRegionSettings, DrawBorderSettings,
            MinimumUpdateIntervalSettings, SecondaryWindowSettings, Settings,
        },
    };

    /// Crop rect in monitor-local physical pixels, plus the reply channel.
    pub type Flags = (i32, i32, u32, u32, oneshot::Sender<Result<String, String>>);

    pub struct CaptureHandler {
        x: i32,
        y: i32,
        width: u32,
        height: u32,
        sender: Option<oneshot::Sender<Result<String, String>>>,
    }

    impl CaptureHandler {
        /// Send the result exactly once; later frames are ignored.
        fn reply(&mut self, result: Result<String, String>) {
            if let Some(tx) = self.sender.take() {
                let _ = tx.send(result);
            }
        }
    }

    impl GraphicsCaptureApiHandler for CaptureHandler {
        type Flags = Flags;
        type Error = Box<dyn std::error::Error + Send + Sync>;

        fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
            let (x, y, width, height, sender) = ctx.flags;
            Ok(Self { x, y, width, height, sender: Some(sender) })
        }

        fn on_frame_arrived(
            &mut self,
            frame: &mut Frame,
            capture_control: InternalCaptureControl,
        ) -> Result<(), Self::Error> {
            // We only ever want a single frame. Stop the session first so that
            // an error path below can never leave the capture running.
            capture_control.stop();

            let surface_w = frame.width();
            let surface_h = frame.height();

            let Some((cx, cy, cw, ch)) =
                clamp_crop(self.x, self.y, self.width, self.height, surface_w, surface_h)
            else {
                self.reply(Err("Selection is outside the captured display".to_string()));
                return Ok(());
            };

            // buffer_crop takes an inclusive-exclusive box, not an origin+size.
            let mut buffer = match frame.buffer_crop(cx, cy, cx + cw, cy + ch) {
                Ok(b) => b,
                Err(e) => {
                    self.reply(Err(format!("Frame crop failed: {e}")));
                    return Ok(());
                }
            };

            // Rows in a D3D staging texture are padded to the row pitch;
            // as_nopadding_buffer repacks them to a tight width*4 stride.
            let bytes = match buffer.as_nopadding_buffer() {
                Ok(b) => b.to_vec(),
                Err(e) => {
                    self.reply(Err(format!("Frame buffer unpack failed: {e}")));
                    return Ok(());
                }
            };

            // We requested Bgra8; the image crate wants Rgba8.
            let mut pixels = bytes;
            for px in pixels.chunks_exact_mut(4) {
                px.swap(0, 2);
            }

            let Some(img) = image::RgbaImage::from_raw(cw, ch, pixels) else {
                self.reply(Err("Frame buffer size did not match crop dimensions".to_string()));
                return Ok(());
            };

            self.reply(encode_crop(img));
            Ok(())
        }

        /// Signature note: in windows-capture 1.5 this takes no control
        /// argument. Fires when the capture item goes away (display unplugged,
        /// session revoked) — without replying here the caller would hang
        /// until the timeout.
        fn on_closed(&mut self) -> Result<(), Self::Error> {
            self.reply(Err("Capture session closed before a frame arrived".to_string()));
            Ok(())
        }
    }

    /// Resolve the monitor under a physical desktop point.
    ///
    /// Returns the raw `HMONITOR` and the monitor's physical origin, so the
    /// caller can convert desktop coordinates into monitor-local ones.
    pub fn monitor_at(x: i32, y: i32) -> Result<(*mut c_void, i32, i32), String> {
        use windows::Win32::Foundation::POINT;
        use windows::Win32::Graphics::Gdi::{
            GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
        };

        unsafe {
            // DEFAULTTONEAREST rather than DEFAULTTONULL: if the point is in
            // the dead space between mismatched monitors we still capture
            // something sensible instead of failing.
            let hmonitor = MonitorFromPoint(POINT { x, y }, MONITOR_DEFAULTTONEAREST);
            if hmonitor.0.is_null() {
                return Err("No display found at the selected point".to_string());
            }

            let mut info = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            if !GetMonitorInfoW(hmonitor, &mut info).as_bool() {
                return Err("Failed to read display bounds".to_string());
            }

            Ok((hmonitor.0, info.rcMonitor.left, info.rcMonitor.top))
        }
    }

    pub async fn capture(x: i32, y: i32, width: u32, height: u32) -> Result<Option<String>, String> {
        let (hmonitor, origin_x, origin_y) = monitor_at(x, y)?;

        let local_x = x - origin_x;
        let local_y = y - origin_y;

        let (tx, rx) = oneshot::channel();

        // HMONITOR is a raw pointer and therefore not Send. Ship it across the
        // thread boundary as an integer and rebuild the Monitor on the far
        // side; this also keeps the non-Send Settings entirely thread-local.
        let hmonitor_addr = hmonitor as usize;

        std::thread::Builder::new()
            .name("mylo-wgc-capture".into())
            .spawn(move || {
                let monitor = Monitor::from_raw_hmonitor(hmonitor_addr as *mut c_void);

                let settings = Settings::new(
                    monitor,
                    CursorCaptureSettings::WithoutCursor,
                    DrawBorderSettings::WithoutBorder,
                    SecondaryWindowSettings::Default,
                    MinimumUpdateIntervalSettings::Default,
                    DirtyRegionSettings::Default,
                    ColorFormat::Bgra8,
                    (local_x, local_y, width, height, tx),
                );

                // Blocks pumping a message loop until on_frame_arrived stops it.
                if let Err(e) = CaptureHandler::start(settings) {
                    log::error!("[MYLO capture] WGC session failed: {e}");
                }
            })
            .map_err(|e| format!("Failed to spawn capture thread: {e}"))?;

        match tokio::time::timeout(
            std::time::Duration::from_secs(CAPTURE_TIMEOUT_SECS),
            rx,
        )
        .await
        {
            Ok(Ok(Ok(b64))) => Ok(Some(b64)),
            Ok(Ok(Err(e))) => Err(e),
            // Sender dropped: CaptureHandler::start bailed before constructing
            // the handler, usually because WGC is unavailable.
            Ok(Err(_)) => Err(
                "Screen capture is unavailable. Windows 10 1903 or newer is required.".to_string(),
            ),
            Err(_) => Err(format!("Screen capture timed out after {CAPTURE_TIMEOUT_SECS}s")),
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// macOS: ScreenCaptureKit via xcap
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
mod mac {
    use super::*;
    use xcap::Monitor;

    /// Pick the display containing a physical desktop point.
    ///
    /// xcap's reported origin/size units are not consistent across platforms
    /// and versions (points on some paths, pixels on others), so we test both
    /// interpretations before giving up. Whichever one contains the point is
    /// by definition the right one.
    fn monitor_at(x: i32, y: i32) -> Result<Monitor, String> {
        let monitors = Monitor::all().map_err(|e| {
            format!("Could not enumerate displays. Grant Screen Recording permission in System Settings › Privacy & Security. ({e})")
        })?;

        if monitors.is_empty() {
            return Err("No displays detected".to_string());
        }

        let contains = |m: &Monitor, scale: f64| -> bool {
            let mx = (m.x().unwrap_or(0) as f64 * scale) as i32;
            let my = (m.y().unwrap_or(0) as f64 * scale) as i32;
            let mw = (m.width().unwrap_or(0) as f64 * scale) as i32;
            let mh = (m.height().unwrap_or(0) as f64 * scale) as i32;
            mw > 0 && mh > 0 && x >= mx && x < mx + mw && y >= my && y < my + mh
        };

        // Pass 1: treat the reported bounds as logical points.
        for m in &monitors {
            let scale = m.scale_factor().unwrap_or(1.0) as f64;
            if scale != 1.0 && contains(m, scale) {
                return Ok(m.clone());
            }
        }
        // Pass 2: treat them as physical pixels.
        for m in &monitors {
            if contains(m, 1.0) {
                return Ok(m.clone());
            }
        }
        // Neither matched — fall back to the primary display.
        if let Some(primary) = monitors.iter().find(|m| m.is_primary().unwrap_or(false)) {
            return Ok(primary.clone());
        }
        monitors.into_iter().next().ok_or_else(|| "No displays detected".to_string())
    }

    pub async fn capture(x: i32, y: i32, width: u32, height: u32) -> Result<Option<String>, String> {
        let work = tokio::task::spawn_blocking(move || -> Result<Option<String>, String> {
            let monitor = monitor_at(x, y)?;

            let reported_w = monitor.width().unwrap_or(0);
            let reported_x = monitor.x().unwrap_or(0);
            let reported_y = monitor.y().unwrap_or(0);

            let img = monitor.capture_image().map_err(|e| {
                format!("Screen capture failed. Grant Screen Recording permission in System Settings › Privacy & Security, then restart MYLO. ({e})")
            })?;

            // Derive the true pixel scale from the image we actually got back
            // rather than trusting the reported scale factor. This collapses to
            // 1.0 when xcap already reports pixels, so it is correct either way.
            let true_scale = if reported_w > 0 {
                img.width() as f64 / reported_w as f64
            } else {
                1.0
            };

            let origin_x = (reported_x as f64 * true_scale).round() as i32;
            let origin_y = (reported_y as f64 * true_scale).round() as i32;

            let Some((cx, cy, cw, ch)) =
                clamp_crop(x - origin_x, y - origin_y, width, height, img.width(), img.height())
            else {
                return Err("Selection is outside the captured display".to_string());
            };

            let cropped = image::imageops::crop_imm(&img, cx, cy, cw, ch).to_image();
            Ok(Some(encode_crop(cropped)?))
        });

        match tokio::time::timeout(std::time::Duration::from_secs(CAPTURE_TIMEOUT_SECS), work).await
        {
            Ok(Ok(result)) => result,
            Ok(Err(e)) => Err(format!("Capture task panicked: {e}")),
            Err(_) => Err(format!("Screen capture timed out after {CAPTURE_TIMEOUT_SECS}s")),
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/// Capture a rectangle of the desktop and return it as base64 JPEG.
///
/// `x`/`y` are **global desktop physical pixels**; `width`/`height` are
/// physical pixels. Returns `Ok(None)` only when there is nothing to capture.
pub async fn capture_crop_async(
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<Option<String>, String> {
    if width == 0 || height == 0 {
        return Ok(None);
    }

    #[cfg(target_os = "windows")]
    {
        return win::capture(x, y, width, height).await;
    }

    #[cfg(target_os = "macos")]
    {
        return mac::capture(x, y, width, height).await;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = (x, y, width, height);
        Err("Screen capture is only supported on Windows and macOS".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::clamp_crop;

    #[test]
    fn crop_inside_surface_is_unchanged() {
        assert_eq!(clamp_crop(10, 20, 100, 50, 1920, 1080), Some((10, 20, 100, 50)));
    }

    #[test]
    fn crop_overhanging_right_edge_is_truncated() {
        assert_eq!(clamp_crop(1900, 0, 100, 50, 1920, 1080), Some((1900, 0, 20, 50)));
    }

    #[test]
    fn crop_starting_off_left_edge_is_clipped_not_shifted() {
        // Origin -10 with width 100 covers 0..90 on this surface.
        assert_eq!(clamp_crop(-10, 0, 100, 50, 1920, 1080), Some((0, 0, 90, 50)));
    }

    #[test]
    fn crop_entirely_off_surface_is_rejected() {
        assert_eq!(clamp_crop(5000, 0, 100, 50, 1920, 1080), None);
        assert_eq!(clamp_crop(-500, 0, 100, 50, 1920, 1080), None);
    }

    #[test]
    fn zero_sized_surface_is_rejected() {
        assert_eq!(clamp_crop(0, 0, 10, 10, 0, 0), None);
    }
}
