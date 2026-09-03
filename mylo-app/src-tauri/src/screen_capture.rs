#[cfg(target_os = "windows")]
use windows_capture::{
    capture::{Context, GraphicsCaptureApiHandler},
    frame::Frame,
    graphics_capture_api::InternalCaptureControl,
    monitor::Monitor,
    settings::{ColorFormat, CursorCaptureSettings, DrawBorderSettings, Settings},
};

use image::{ImageBuffer, Rgba, imageops::FilterType};
use base64::{Engine as _, engine::general_purpose};
use std::io::Cursor;
use tokio::sync::oneshot;

pub fn capture() -> Vec<u8> {
    vec![]
}

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
        
        let screen_width = frame.width();
        let screen_height = frame.height();
        
        if let Ok(mut buffer) = frame.buffer() {
            let buffer_ref = buffer.as_raw_nopadding_buffer().unwrap_or(buffer.as_raw_buffer());
            // It's BGRA format usually
            
            // Convert to Rgba
            let mut pixels = buffer_ref.to_vec();
            for chunk in pixels.chunks_exact_mut(4) {
                let b = chunk[0];
                let r = chunk[2];
                chunk[0] = r;
                chunk[2] = b;
            }
            
            if let Some(img) = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(screen_width, screen_height, pixels) {
                // Now crop it
                // Make sure x and y are within bounds
                let mut crop_x = self.x as u32;
                let mut crop_y = self.y as u32;
                let mut crop_w = self.width;
                let mut crop_h = self.height;

                if crop_x >= screen_width { crop_x = 0; }
                if crop_y >= screen_height { crop_y = 0; }
                if crop_x + crop_w > screen_width { crop_w = screen_width - crop_x; }
                if crop_y + crop_h > screen_height { crop_h = screen_height - crop_y; }

                let mut cropped = image::imageops::crop_imm(&img, crop_x, crop_y, crop_w, crop_h).to_image();

                if crop_w > 1024 || crop_h > 1024 {
                    let new_width = if crop_w > crop_h { 1024 } else { (1024.0 * crop_w as f32 / crop_h as f32) as u32 };
                    let new_height = if crop_h > crop_w { 1024 } else { (1024.0 * crop_h as f32 / crop_w as f32) as u32 };
                    
                    cropped = image::imageops::resize(&cropped, new_width, new_height, FilterType::Triangle);
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
        
        if let Some(sender) = self.sender.take() {
            let _ = sender.send(base64_result);
        }
        
        capture_control.stop();
        Ok(())
    }

    fn on_closed(
        &mut self,
        _capture_control: InternalCaptureControl,
    ) -> Result<(), Self::Error> {
        Ok(())
    }
}

pub async fn capture_crop_async(x: i32, y: i32, width: u32, height: u32) -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let (tx, rx) = oneshot::channel();
        
        let primary_monitor = Monitor::primary().unwrap();
        let settings = Settings::new(
            primary_monitor.into(),
            CursorCaptureSettings::WithoutCursor,
            DrawBorderSettings::WithoutBorder,
            ColorFormat::Bgra8,
            (x, y, width, height, tx),
        );
        
        // Run capture on a separate thread to not block tokio worker
        std::thread::spawn(move || {
            let _ = windows_capture::capture::GraphicsCaptureApi::start::<CaptureHandler>(settings);
        });
        
        rx.await.unwrap_or(None)
    }

    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}
