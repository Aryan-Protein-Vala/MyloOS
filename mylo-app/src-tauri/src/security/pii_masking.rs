use image::{DynamicImage, GenericImage, Rgba};
use regex::Regex;
use std::io::Cursor;
use base64::{Engine as _, engine::general_purpose};

/// A detected piece of text with its bounding box coordinates
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DetectedText {
    pub text: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

pub fn normalized_bottom_left_to_top_left_pixels(
    norm_x: f64,
    norm_y: f64,
    norm_w: f64,
    norm_h: f64,
    img_w: u32,
    img_h: u32,
) -> (u32, u32, u32, u32) {
    let w_f = img_w as f64;
    let h_f = img_h as f64;

    let x = (norm_x * w_f).clamp(0.0, w_f).round() as u32;
    let y = ((1.0 - norm_y - norm_h) * h_f).clamp(0.0, h_f).round() as u32;
    let width = (norm_w * w_f).clamp(0.0, w_f).round() as u32;
    let height = (norm_h * h_f).clamp(0.0, h_f).round() as u32;

    (x, y, width, height)
}

#[cfg(target_os = "macos")]
#[link(name = "Vision", kind = "framework")]
extern "C" {}

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
struct CGPoint {
    x: f64,
    y: f64,
}

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
struct CGSize {
    width: f64,
    height: f64,
}

#[cfg(target_os = "macos")]
#[repr(C)]
#[derive(Copy, Clone, Debug, Default)]
struct CGRect {
    origin: CGPoint,
    size: CGSize,
}

#[cfg(target_os = "macos")]
unsafe impl objc::Encode for CGPoint {
    fn encode() -> objc::Encoding {
        unsafe { objc::Encoding::from_str("{CGPoint=dd}") }
    }
}

#[cfg(target_os = "macos")]
unsafe impl objc::Encode for CGSize {
    fn encode() -> objc::Encoding {
        unsafe { objc::Encoding::from_str("{CGSize=dd}") }
    }
}

#[cfg(target_os = "macos")]
unsafe impl objc::Encode for CGRect {
    fn encode() -> objc::Encoding {
        unsafe { objc::Encoding::from_str("{CGRect={CGPoint=dd}{CGSize=dd}}") }
    }
}

#[cfg(target_os = "macos")]
pub fn perform_native_ocr(img: &DynamicImage) -> Vec<DetectedText> {
    use objc::{msg_send, sel, sel_impl, runtime::{Class, Object}};
    use std::ffi::CStr;
    use std::io::Cursor;
    use std::os::raw::{c_char, c_void};

    objc::rc::autoreleasepool(|| {
        let req_handler_cls = match Class::get("VNImageRequestHandler") {
            Some(cls) => cls,
            None => {
                log::warn!("[MYLO OCR] VNImageRequestHandler class not found in ObjC runtime");
                return vec![];
            }
        };

        let req_cls = match Class::get("VNRecognizeTextRequest") {
            Some(cls) => cls,
            None => {
                log::warn!("[MYLO OCR] VNRecognizeTextRequest class not found in ObjC runtime");
                return vec![];
            }
        };

        let ns_data_cls = match Class::get("NSData") {
            Some(cls) => cls,
            None => return vec![],
        };

        let ns_array_cls = match Class::get("NSArray") {
            Some(cls) => cls,
            None => return vec![],
        };

        let ns_dict_cls = match Class::get("NSDictionary") {
            Some(cls) => cls,
            None => return vec![],
        };

        // Encode DynamicImage to PNG memory buffer
        let mut image_bytes = Vec::new();
        if img.write_to(&mut Cursor::new(&mut image_bytes), image::ImageFormat::Png).is_err() {
            log::warn!("[MYLO OCR] Failed to encode image to PNG for Vision OCR");
            return vec![];
        }

        if image_bytes.is_empty() {
            return vec![];
        }

        unsafe {
            // Create NSData from PNG bytes
            let ns_data: *mut Object = msg_send![
                ns_data_cls,
                dataWithBytes: image_bytes.as_ptr() as *const c_void
                length: image_bytes.len()
            ];
            if ns_data.is_null() {
                return vec![];
            }

            // Create empty options dictionary
            let options: *mut Object = msg_send![ns_dict_cls, dictionary];

            // Instantiate VNImageRequestHandler
            let handler: *mut Object = msg_send![req_handler_cls, alloc];
            if handler.is_null() {
                return vec![];
            }
            let handler: *mut Object = msg_send![handler, initWithData: ns_data options: options];
            if handler.is_null() {
                return vec![];
            }
            let _: () = msg_send![handler, autorelease];

            // Instantiate VNRecognizeTextRequest
            let request: *mut Object = msg_send![req_cls, alloc];
            if request.is_null() {
                return vec![];
            }
            let request: *mut Object = msg_send![request, init];
            if request.is_null() {
                return vec![];
            }
            let _: () = msg_send![request, autorelease];

            // Set recognition level to accurate (0) and enable language correction
            let _: () = msg_send![request, setRecognitionLevel: 0isize];
            let _: () = msg_send![request, setUsesLanguageCorrection: true];

            // Wrap request into NSArray
            let requests: *mut Object = msg_send![ns_array_cls, arrayWithObject: request];
            if requests.is_null() {
                return vec![];
            }

            // Perform OCR request
            let mut error: *mut Object = std::ptr::null_mut();
            let success: bool = msg_send![handler, performRequests: requests error: &mut error];
            if !success {
                if !error.is_null() {
                    let desc: *mut Object = msg_send![error, localizedDescription];
                    if !desc.is_null() {
                        let utf8: *const c_char = msg_send![desc, UTF8String];
                        if !utf8.is_null() {
                            let err_msg = CStr::from_ptr(utf8).to_string_lossy();
                            log::warn!("[MYLO OCR] Vision OCR failed: {}", err_msg);
                        }
                    }
                }
                return vec![];
            }

            // Extract results
            let results: *mut Object = msg_send![request, results];
            if results.is_null() {
                return vec![];
            }

            let count: usize = msg_send![results, count];
            let mut detected = Vec::with_capacity(count);

            for i in 0..count {
                let observation: *mut Object = msg_send![results, objectAtIndex: i];
                if observation.is_null() {
                    continue;
                }

                // Get top recognized text candidate
                let candidates: *mut Object = msg_send![observation, topCandidates: 1usize];
                if candidates.is_null() {
                    continue;
                }
                let cand_count: usize = msg_send![candidates, count];
                if cand_count == 0 {
                    continue;
                }

                let candidate: *mut Object = msg_send![candidates, objectAtIndex: 0usize];
                if candidate.is_null() {
                    continue;
                }

                let string_val: *mut Object = msg_send![candidate, string];
                if string_val.is_null() {
                    continue;
                }

                let utf8_ptr: *const c_char = msg_send![string_val, UTF8String];
                if utf8_ptr.is_null() {
                    continue;
                }

                let text = CStr::from_ptr(utf8_ptr).to_string_lossy().into_owned();

                // Get normalized bounding box: origin (0,0) is bottom-left, coords in [0, 1]
                let bbox: CGRect = msg_send![observation, boundingBox];

                let (x, y, width, height) = normalized_bottom_left_to_top_left_pixels(
                    bbox.origin.x,
                    bbox.origin.y,
                    bbox.size.width,
                    bbox.size.height,
                    img.width(),
                    img.height(),
                );

                detected.push(DetectedText {
                    text,
                    x,
                    y,
                    width,
                    height,
                });
            }

            detected
        }
    })
}

#[cfg(target_os = "windows")]
pub fn perform_native_ocr(_img: &DynamicImage) -> Vec<DetectedText> {
    // Stub for Windows.Media.Ocr
    vec![]
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
pub fn perform_native_ocr(_img: &DynamicImage) -> Vec<DetectedText> {
    vec![]
}

pub static PII_REGEX: std::sync::LazyLock<Regex> = std::sync::LazyLock::new(|| {
    Regex::new(r"(?i)\b(\d{4}[ -]?){3}\d{4}\b|\b\d{3}-\d{2}-\d{4}\b|sk-[A-Za-z0-9_-]{32,}").unwrap()
});

/// Masks PII in a raw image buffer (e.g., JPEG or PNG) before sending it to cloud models.
pub fn mask_pii_in_image(b64_image: &str) -> Result<String, String> {
    log::info!("[MYLO Security] Scanning screenshot for PII before transmission...");
    
    // Decode base64
    let image_data = general_purpose::STANDARD
        .decode(b64_image)
        .map_err(|e| format!("Base64 decode error: {}", e))?;
        
    let mut img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Image decode error: {}", e))?;
        
    let detected_blocks = perform_native_ocr(&img);
    let mut masked_count = 0;
    
    for block in detected_blocks {
        if PII_REGEX.is_match(&block.text) {
            log::info!("[MYLO Security] Detected PII at ({}, {}). Masking...", block.x, block.y);
            let black = Rgba([0, 0, 0, 255]);
            for y in block.y..(block.y + block.height).min(img.height()) {
                for x in block.x..(block.x + block.width).min(img.width()) {
                    img.put_pixel(x, y, black);
                }
            }
            masked_count += 1;
        }
    }
    
    if masked_count == 0 {
        return Ok(b64_image.to_string());
    }
    
    let mut buffer = Cursor::new(Vec::new());
    img.write_to(&mut buffer, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Image encode error: {}", e))?;
        
    Ok(general_purpose::STANDARD.encode(buffer.into_inner()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, RgbaImage};

    #[test]
    fn test_normalized_bottom_left_to_top_left_pixels() {
        // Image size 1000 x 500
        // A box at the top of the image: in bottom-left coords, y=0.8, h=0.2 (from 0.8 to 1.0)
        let (x, y, w, h) = normalized_bottom_left_to_top_left_pixels(0.1, 0.8, 0.3, 0.2, 1000, 500);
        assert_eq!(x, 100);
        assert_eq!(y, 0);
        assert_eq!(w, 300);
        assert_eq!(h, 100);

        // A box at the bottom of the image: in bottom-left coords, y=0.0, h=0.2 (from 0.0 to 0.2)
        let (x, y, w, h) = normalized_bottom_left_to_top_left_pixels(0.0, 0.0, 0.5, 0.2, 1000, 500);
        assert_eq!(x, 0);
        assert_eq!(y, 400);
        assert_eq!(w, 500);
        assert_eq!(h, 100);
    }

    #[test]
    fn test_perform_native_ocr_blank_image() {
        let buffer: RgbaImage = ImageBuffer::from_pixel(100, 100, Rgba([255, 255, 255, 255]));
        let img = DynamicImage::ImageRgba8(buffer);
        let detected = perform_native_ocr(&img);
        // OCR on blank image should succeed safely and return empty list
        assert!(detected.is_empty());
    }

    #[test]
    fn test_pii_regex_matches() {
        assert!(PII_REGEX.is_match("Card 4532-1234-5678-9012 valid"));
        assert!(PII_REGEX.is_match("SSN: 123-45-6789"));
        assert!(PII_REGEX.is_match("sk-proj-1234567890abcdef1234567890abcdef"));
        assert!(!PII_REGEX.is_match("Hello world this is a normal test string"));
    }
}
