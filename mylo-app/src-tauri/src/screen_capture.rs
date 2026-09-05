// ── Windows ──────────────────────────────────────────────────────────────────
#[cfg(target_os = "windows")]
use windows_capture::{
    capture::{Context, GraphicsCaptureApiHandler},
    frame::Frame,
    graphics_capture_api::InternalCaptureControl,
    monitor::Monitor,
    settings::{ColorFormat, CursorCaptureSettings, DrawBorderSettings, Settings},
};
#[cfg(target_os = "windows")]
use image::{ImageBuffer, Rgba, imageops::FilterType};
#[cfg(target_os = "windows")]
use base64::{Engine as _, engine::general_purpose};
#[cfg(target_os = "windows")]
use std::io::Cursor;
#[cfg(target_os = "windows")]
use tokio::sync::oneshot;

// ── macOS ─────────────────────────────────────────────────────────────────────
#[cfg(target_os = "macos")]
use base64::{Engine as _, engine::general_purpose};
#[cfg(target_os = "macos")]
use std::io::Cursor;

// ─────────────────────────────────────────────────────────────────────────────
// Windows: WGC capture handler
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
struct CaptureHandler {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    sender: Option<oneshot::Sender<Option<String>>>,
}

#[cfg(target_os = "windows")]
impl GraphicsCaptureApiHandler for CaptureHandler {
    type Flags = (i32, i32, u32, u32, oneshot::Sender<Option<String>>);
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
        let mut base64_result = None;
        let sw = frame.width();
        let sh = frame.height();

        if let Ok(mut buffer) = frame.buffer() {
            let raw_bytes = match buffer.as_raw_nopadding_buffer() {
                Ok(b) => b.to_vec(),
                Err(_) => buffer.as_raw_buffer().to_vec(),
            };

            // BGRA → RGBA
            let mut pixels = raw_bytes;
            for chunk in pixels.chunks_exact_mut(4) {
                chunk.swap(0, 2);
            }

            if let Some(img) = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(sw, sh, pixels) {
                let cx = (self.x as u32).min(sw.saturating_sub(1));
                let cy = (self.y as u32).min(sh.saturating_sub(1));
                let cw = self.width.min(sw - cx);
                let ch = self.height.min(sh - cy);

                if cw > 0 && ch > 0 {
                    let mut cropped = image::imageops::crop_imm(&img, cx, cy, cw, ch).to_image();

                    if cw > 1024 || ch > 1024 {
                        let (nw, nh) = if cw > ch {
                            (1024u32, (1024.0 * ch as f32 / cw as f32) as u32)
                        } else {
                            ((1024.0 * cw as f32 / ch as f32) as u32, 1024u32)
                        };
                        cropped = image::imageops::resize(&cropped, nw, nh, FilterType::Triangle);
                    }

                    let mut buf = Cursor::new(Vec::new());
                    if image::write_buffer_with_format(
                        &mut buf,
                        &cropped,
                        cropped.width(),
                        cropped.height(),
                        image::ColorType::Rgba8,
                        image::ImageFormat::Jpeg,
                    ).is_ok() {
                        base64_result = Some(general_purpose::STANDARD.encode(buf.into_inner()));
                    }
                }
            }
        }

        if let Some(sender) = self.sender.take() {
            let _ = sender.send(base64_result);
        }
        capture_control.stop();
        Ok(())
    }

    fn on_closed(&mut self, _cc: InternalCaptureControl) -> Result<(), Self::Error> {
        if let Some(sender) = self.sender.take() {
            let _ = sender.send(None);
        }
        Ok(())
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-platform public API
// ─────────────────────────────────────────────────────────────────────────────

/// Main capture entry-point. Works on Windows (WGC) and macOS (xcap/SCK).
pub async fn capture_crop_async(x: i32, y: i32, width: u32, height: u32) -> Option<String> {
    // ── Windows path ────────────────────────────────────────────────────────
    #[cfg(target_os = "windows")]
    {
        let (tx, rx) = oneshot::channel();
        let primary = Monitor::primary().ok()?;
        let settings = Settings::new(
            primary.into(),
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
            ColorFormat::Bgra8,
            (x, y, width, height, tx),
        );
        std::thread::spawn(move || {
            let _ = windows_capture::capture::GraphicsCaptureApi::start::<CaptureHandler>(settings);
        });
        return rx.await.unwrap_or(None);
    }

    // ── macOS path ──────────────────────────────────────────────────────────
    #[cfg(target_os = "macos")]
    {
        // xcap::Monitor uses CGDisplayCreateImage which goes through the
        // macOS compositor — captures hardware-accelerated content.
        // Run blocking I/O on a dedicated thread.
        let result = tokio::task::spawn_blocking(move || -> Option<String> {
            use xcap::Monitor;
            use image::imageops::FilterType;

            let monitors = Monitor::all().ok()?;
            let primary = monitors.into_iter().find(|m| m.is_primary().unwrap_or(false))?;
            let img = primary.capture_image().ok()?;

            let iw = img.width();
            let ih = img.height();

            let cx = (x.max(0) as u32).min(iw.saturating_sub(1));
            let cy = (y.max(0) as u32).min(ih.saturating_sub(1));
            let cw = width.min(iw - cx);
            let ch = height.min(ih - cy);
            if cw == 0 || ch == 0 { return None; }

            let mut cropped = image::imageops::crop_imm(&img, cx, cy, cw, ch).to_image();

            if cw > 1024 || ch > 1024 {
                let (nw, nh) = if cw > ch {
                    (1024u32, (1024.0 * ch as f32 / cw as f32) as u32)
                } else {
                    ((1024.0 * cw as f32 / ch as f32) as u32, 1024u32)
                };
                cropped = image::imageops::resize(&cropped, nw, nh, FilterType::Triangle);
            }

            let mut buf = Cursor::new(Vec::new());
            image::write_buffer_with_format(
                &mut buf,
                &cropped,
                cropped.width(),
                cropped.height(),
                image::ColorType::Rgba8,
                image::ImageFormat::Jpeg,
            ).ok()?;

            Some(general_purpose::STANDARD.encode(buf.into_inner()))
        })
        .await
        .unwrap_or(None);

        return result;
    }

    // ── Unsupported platform ─────────────────────────────────────────────────
    #[allow(unreachable_code)]
    None
}
