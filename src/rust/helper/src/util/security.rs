//! Utility functions for working with Apple's Security framework.

use std::{io::Error, mem::MaybeUninit, path::Path, process::Command, ptr};

use common::util::macos::error_from_cf_error;
use objc2_core_foundation::{CFError, CFRetained, CFString};
use objc2_security::{
    errSecSuccess, SecCSFlags, SecRequirement, SecRequirementCreateWithStringAndErrors,
};

// Create a `SecRequirement` object from the given macOS security requirement string.
pub fn create_sec_requirement_from_requirement_string(
    requirement: &str,
) -> Result<CFRetained<SecRequirement>, Error> {
    let mut sec_requirement = MaybeUninit::<*mut SecRequirement>::uninit();
    let mut error: *mut CFError = ptr::null_mut();
    // Safety: Follows the "Create rule", and thus the object is owned by the caller. Therefore,
    // `sec_requirement` needs to be retained after successful initialization (see below). Other
    // inputs are either constants ore `CFRetained<_>`.
    let status = unsafe {
        SecRequirementCreateWithStringAndErrors(
            &CFString::from_str(requirement),
            SecCSFlags::empty(),
            &mut error,
            ptr::NonNull::new(sec_requirement.as_mut_ptr())
                // Safety: Even though the object is not yet initialized, the pointer is non-null.
                .unwrap(),
        )
    };
    if status != errSecSuccess {
        return Err(
            // Safety: `CFError` was produced by `SecRequirementCreateWithStringAndErrors`, so we
            // need to trust that it is valid.
            unsafe { error_from_cf_error(error.as_ref(), "SecRequirementCreate") },
        );
    }
    // Safety: `sec_requirement` is expected to be initialized at this point and can be retained
    // without additional checks. `CFRetained<_>` implements the `Drop` trait to release the object.
    let sec_requirement =
        unsafe { CFRetained::from_raw(ptr::NonNull::new_unchecked(sec_requirement.assume_init())) };

    Ok(sec_requirement)
}

/// Remove the quarantine flag from the file or directory at the given `path`.
///
/// Note: The caller is responsible for ensuring that it's safe to remove the quarantine attribute
/// from the given file beforehand, e.g. by ensuring its integrity and signature.
pub fn remove_quarantine_attribute(path: &Path, is_directory: bool) -> Result<(), Error> {
    let mut command = Command::new("xattr");

    if is_directory {
        command.arg("-r");
    }

    command
        .arg("-d")
        .arg("com.apple.quarantine")
        .arg(path)
        .output()
        .map(|_| ())
}
