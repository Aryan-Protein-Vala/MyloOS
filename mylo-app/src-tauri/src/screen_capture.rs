#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HDC, HBITMAP, SRCCOPY,
};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{GetDesktopWindow, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

use image::{ImageBuffer, Rgba, imageops::FilterType};
use base64::{Engine as _, engine::general_purpose};
use std::io::Cursor;

pub fn capture() -> Vec<u8> {
    // Legacy placeholder
    vec![]
}

pub fn capture_crop(x: i32, y: i32, width: u32, height: u32) -> Option<String> {
    #[cfg(target_os = "windows")]
    unsafe {
        let hwnd = GetDesktopWindow();
        let hdc_screen = GetDC(hwnd);
        if hdc_screen.is_invalid() {
            return None;
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            return None;
        }

        let hbm_screen = CreateCompatibleBitmap(hdc_screen, width as i32, height as i32);
        if hbm_screen.is_invalid() {
            DeleteDC(hdc_mem);
            return None;
        }

        let hbm_old = SelectObject(hdc_mem, hbm_screen.into());

        // BitBlt from screen to memory DC, cropped
        let success = BitBlt(hdc_mem, 0, 0, width as i32, height as i32, hdc_screen, x, y, SRCCOPY);

        let mut base64_result = None;

        if success.is_ok() {
            let mut bmi = BITMAPINFO {
                bmiHeader: BITMAPINFOHEADER {
                    biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                    biWidth: width as i32,
                    biHeight: -(height as i32), // top-down DIB
                    biPlanes: 1,
                    biBitCount: 32,
                    biCompression: BI_RGB.0,
                    biSizeImage: 0,
                    biXPelsPerMeter: 0,
                    biYPelsPerMeter: 0,
                    biClrUsed: 0,
                    biClrImportant: 0,
                },
                bmiColors: [windows::Win32::Graphics::Gdi::RGBQUAD { rgbBlue: 0, rgbGreen: 0, rgbRed: 0, rgbReserved: 0 }; 1],
            };

            let mut pixels: Vec<u8> = vec![0; (width * height * 4) as usize];

            let scanlines = GetDIBits(
                hdc_screen,
                hbm_screen,
                0,
                height,
                Some(pixels.as_mut_ptr() as *mut _),
                &mut bmi,
                DIB_RGB_COLORS,
            );

            if scanlines > 0 {
                // Convert BGRA to RGBA
                for chunk in pixels.chunks_exact_mut(4) {
                    let b = chunk[0];
                    let r = chunk[2];
                    chunk[0] = r;
                    chunk[2] = b;
                }

                if let Some(mut img) = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width, height, pixels) {
                    // Scale down if too large (e.g. max 1024x1024) to save tokens
                    if width > 1024 || height > 1024 {
                        let new_width = if width > height { 1024 } else { (1024.0 * width as f32 / height as f32) as u32 };
                        let new_height = if height > width { 1024 } else { (1024.0 * height as f32 / width as f32) as u32 };
                        
                        let resized = image::imageops::resize(&img, new_width, new_height, FilterType::Triangle);
                        img = resized;
                    }

                    let mut buf = Cursor::new(Vec::new());
                    if image::write_buffer_with_format(
                        &mut buf,
                        &img,
                        img.width(),
                        img.height(),
                        image::ColorType::Rgba8,
                        image::ImageFormat::Jpeg,
                    ).is_ok() {
                        base64_result = Some(general_purpose::STANDARD.encode(buf.into_inner()));
                    }
                }
            }
        }

        SelectObject(hdc_mem, hbm_old);
        DeleteObject(hbm_screen.into());
        DeleteDC(hdc_mem);
        let _ = windows::Win32::UI::WindowsAndMessaging::ReleaseDC(hwnd, hdc_screen);

        base64_result
    }

    #[cfg(not(target_os = "windows"))]
    {
        println!("Screen capture currently only implemented for Windows via GDI.");
        None
    }
}
