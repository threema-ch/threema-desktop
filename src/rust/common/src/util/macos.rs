use std::{
    io::{Error, ErrorKind},
    ptr,
};

use objc2::{rc::Retained, Message};
use objc2_core_foundation::{
    CFDictionary, CFError, CFErrorCopyDescription, CFErrorGetCode, CFRetained, Type, CFURL,
};
use objc2_foundation::{NSDictionary, NSURL};

/// Creates a new `std::io::Error` object from the given `CFError`, extracting as much error
/// information as possible.
///
/// # Safety
///
/// If the reference in `Some(cf_error)` is not a valid CFError, the behavior is undefined.
pub unsafe fn error_from_cf_error(cf_error: Option<&CFError>, operation_name: &str) -> Error {
    let error = cf_error
        .map(|error| {
            // Safety: Caller needs to ensure that `error` is a valid `CFError`.
            let code = unsafe { CFErrorGetCode(error) };
            // Safety: Follows the "Create rule", and thus returns a `CFRetained<_>` owned by the
            // caller, which implements the `Drop` trait to release the object.
            let description = unsafe { CFErrorCopyDescription(error) }
                .map(|value| value.to_string())
                .unwrap_or("unknown".to_string());

            format!(
                "{} failed with code: {} and error: {}",
                operation_name, code, description
            )
        })
        .unwrap_or(format!("{} failed with error: unknown", operation_name));

    Error::new(ErrorKind::Other, error)
}

/// Marker trait indicating that a Foundation type can be toll-free bridged to a Core Foundation
/// type.
pub trait TollFreeBridgeable: Message {
    /// The Core Foundation type this Foundation type bridges to.
    type BridgedCFType: Type;
}

impl TollFreeBridgeable for NSURL {
    type BridgedCFType = CFURL;
}

impl TollFreeBridgeable for NSDictionary {
    type BridgedCFType = CFDictionary;
}

/// Marker trait indicating that a Core Foundation type can be toll-free bridged to a Foundation
/// type.
pub trait CFTollFreeBridgeable: Type {
    /// The Foundation type this Core Foundation type bridges to.
    type BridgedNSType: Message;
}

impl CFTollFreeBridgeable for CFURL {
    type BridgedNSType = NSURL;
}

impl CFTollFreeBridgeable for CFDictionary {
    type BridgedNSType = NSDictionary;
}

/// Bridges a Core Foundation object to a Foundation object. See:
/// https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFDesignConcepts/Articles/tollFreeBridgedTypes.html.
///
/// Note: This is a band-aid until `objc2` provides a better way. See:
/// https://github.com/madsmtm/objc2/issues/693, and
/// https://github.com/madsmtm/objc2/issues/643#issuecomment-2614095153
///
/// # Example
///
/// ```
/// let url: CFRetained<NSURL> = toll_free_bridge_cf_to_ns(&my_cf_url);
/// ```
pub fn toll_free_bridge_cf_to_ns<TInputCFType: CFTollFreeBridgeable>(
    cf_object: &CFRetained<TInputCFType>,
) -> Retained<TInputCFType::BridgedNSType> {
    // Get the raw pointer to the `cf_object`, and increment the reference count using `retain` to
    // detach it from the lifetime information carried by the reference.
    let cf_ptr = CFRetained::into_raw(cf_object.retain());

    // Cast the pointer to the corresponding Foundation type.
    let ns_ptr = cf_ptr.as_ptr().cast::<TInputCFType::BridgedNSType>();

    // Wrap pointer in a `Retained`.
    //
    // Safety: The pointer is non-null because it comes from a `CFRetained` object. `from_raw`
    // constructs a `Retained` from a pointer that already has +1 retain count, which was ensured by
    // calling `retain` above.
    unsafe { Retained::from_raw(ns_ptr).unwrap() }
}

/// Bridges a Foundation object to a Core Foundation object. See:
/// https://developer.apple.com/library/archive/documentation/CoreFoundation/Conceptual/CFDesignConcepts/Articles/tollFreeBridgedTypes.html.
///
/// Note: This is a band-aid until `objc2` provides a better way. See:
/// https://github.com/madsmtm/objc2/issues/693, and
/// https://github.com/madsmtm/objc2/issues/643#issuecomment-2614095153
///
/// # Example
///
/// ```
/// let url: CFRetained<CFURL> = toll_free_bridge_ns_to_cf(&my_ns_url);
/// ```
pub fn toll_free_bridge_ns_to_cf<TInputNSType: TollFreeBridgeable>(
    ns_object: &Retained<TInputNSType>,
) -> CFRetained<TInputNSType::BridgedCFType> {
    // Get the raw pointer to the `ns_object`, and increment the reference count using `retain` to
    // detach it from the lifetime information carried by the reference.
    let ns_ptr = Retained::into_raw(ns_object.retain());

    // Cast the pointer to the corresponding Core Foundation type.
    let cf_ptr = ptr::NonNull::new(ns_ptr)
        // Safety: The pointer is non-null because it comes from a `Retained` object.
        .unwrap()
        .cast::<TInputNSType::BridgedCFType>();

    // Wrap pointer in a `CFRetained`.
    //
    // Safety: `from_raw` constructs a `CFRetained` from a pointer that already has +1 retain count,
    // which was ensured by calling `retain` above.
    unsafe { CFRetained::from_raw(cf_ptr) }
}
