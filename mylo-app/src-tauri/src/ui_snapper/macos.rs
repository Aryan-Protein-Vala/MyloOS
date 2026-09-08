#[cfg(target_os = "macos")]
pub mod sys {
    use core_foundation::base::CFTypeRef;
    use core_foundation::string::CFStringRef;

    #[repr(C)]
    pub struct __AXUIElement(std::ffi::c_void);
    pub type AXUIElementRef = *const __AXUIElement;

    #[repr(C)]
    #[derive(Debug, Clone, Copy)]
    pub struct CGPoint {
        pub x: f64,
        pub y: f64,
    }

    #[repr(C)]
    #[derive(Debug, Clone, Copy)]
    pub struct CGSize {
        pub width: f64,
        pub height: f64,
    }

    #[repr(C)]
    #[derive(Debug, Clone, Copy)]
    pub struct CGRect {
        pub origin: CGPoint,
        pub size: CGSize,
    }

    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        pub fn AXUIElementCreateSystemWide() -> AXUIElementRef;
        pub fn AXUIElementCopyElementAtPosition(
            systemWide: AXUIElementRef,
            x: f32,
            y: f32,
            outElement: *mut AXUIElementRef,
        ) -> i32; // AXError
        
        pub fn AXUIElementCopyAttributeValue(
            element: AXUIElementRef,
            attribute: CFStringRef,
            value: *mut CFTypeRef,
        ) -> i32;
        
        pub fn AXValueGetValue(
            value: CFTypeRef,
            theType: i32,
            valuePtr: *mut std::ffi::c_void,
        ) -> bool;
    }

    pub const K_AX_ERROR_SUCCESS: i32 = 0;
    pub const K_AX_VALUE_CG_POINT_TYPE: i32 = 1;
    pub const K_AX_VALUE_CG_SIZE_TYPE: i32 = 2;
}

#[cfg(target_os = "macos")]
pub fn snap_to_element(x: i32, y: i32) -> Option<(i32, i32)> {
    use sys::*;
    use core_foundation::base::TCFType;
    use core_foundation::string::CFString;
    use std::ptr;

    unsafe {
        let system_wide = AXUIElementCreateSystemWide();
        if system_wide.is_null() {
            return None;
        }

        let mut element: AXUIElementRef = ptr::null();
        let err = AXUIElementCopyElementAtPosition(
            system_wide,
            x as f32,
            y as f32,
            &mut element,
        );

        // CoreFoundation Create rule: caller owns system_wide and must release it
        core_foundation::base::CFRelease(system_wide as _);
        
        if err != K_AX_ERROR_SUCCESS || element.is_null() {
            return None;
        }

        let position_key = CFString::new("AXPosition");
        let size_key = CFString::new("AXSize");

        let mut pos_value: core_foundation::base::CFTypeRef = ptr::null();
        let mut size_value: core_foundation::base::CFTypeRef = ptr::null();

        let pos_err = AXUIElementCopyAttributeValue(element, position_key.as_concrete_TypeRef(), &mut pos_value);
        let size_err = AXUIElementCopyAttributeValue(element, size_key.as_concrete_TypeRef(), &mut size_value);

        if pos_err != K_AX_ERROR_SUCCESS || size_err != K_AX_ERROR_SUCCESS || pos_value.is_null() || size_value.is_null() {
            if !pos_value.is_null() {
                core_foundation::base::CFRelease(pos_value);
            }
            if !size_value.is_null() {
                core_foundation::base::CFRelease(size_value);
            }
            core_foundation::base::CFRelease(element as _);
            return None;
        }

        let mut point = CGPoint { x: 0.0, y: 0.0 };
        let mut size = CGSize { width: 0.0, height: 0.0 };

        let pos_ok = AXValueGetValue(pos_value, K_AX_VALUE_CG_POINT_TYPE, &mut point as *mut _ as *mut _);
        let size_ok = AXValueGetValue(size_value, K_AX_VALUE_CG_SIZE_TYPE, &mut size as *mut _ as *mut _);

        core_foundation::base::CFRelease(pos_value);
        core_foundation::base::CFRelease(size_value);
        core_foundation::base::CFRelease(element as _);

        if pos_ok && size_ok {
            // Calculate center
            let cx = point.x + (size.width / 2.0);
            let cy = point.y + (size.height / 2.0);
            return Some((cx.round() as i32, cy.round() as i32));
        }

        None
    }
}
