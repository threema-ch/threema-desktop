//! Utility functions for working with Apple's `launchd`.

use std::{
    ffi::CString,
    io::{Error, ErrorKind},
    mem::MaybeUninit,
    os::fd::{FromRawFd, OwnedFd},
    ptr,
};

use common::util::macos::error_from_cf_error;
use libc::{c_char, c_int, size_t, EALREADY, ENOENT, ESRCH};
use objc2_core_foundation::{
    kCFAllocatorDefault, CFDictionaryAddValue, CFDictionaryCreateMutable, CFError, CFNumber,
    CFRetained,
};
use objc2_security::{
    kSecGuestAttributePid, SecCSFlags, SecCode, SecCodeCheckValidityWithErrors,
    SecCodeCopyGuestWithAttributes,
};
use tokio::net::{UnixListener, UnixStream};

use super::security::create_sec_requirement_from_requirement_string;

extern "C" {
    /// See: https://developer.apple.com/documentation/xpc/1505523-launch_activate_socket.
    fn launch_activate_socket(name: *const c_char, fds: *mut *mut c_int, cnt: *mut size_t)
        -> c_int;
}

/// Validates whether the peer connected to the launchd socket of the given `UnixStream` fulfills
/// the given macOS security requirement string. Important: This should be used to ensure the peer
/// fulfills the necessary code signature requirements before processing its request(s).
pub fn client_matches_code_signature_requirement(
    stream: &UnixStream,
    requirement: &str,
) -> Result<(), Error> {
    let credentials = stream.peer_cred()?;
    let pid = credentials
        .pid()
        .expect("Expected macOS to support pid retrieval");

    // Create guest attributes dictionary.
    //
    // Safety: Follows the "Create rule", and thus returns a `CFRetained<_>` owned by the caller,
    // which implements the `Drop` trait to release the object.
    let guest_attributes = unsafe {
        CFDictionaryCreateMutable(kCFAllocatorDefault, 1, ptr::null_mut(), ptr::null_mut())
    };
    let value = CFNumber::new_i32(pid);
    // Safety: Marked `unsafe` due to FFI. Input arguments are constants or `CFRetained<_>`.
    unsafe {
        CFDictionaryAddValue(
            guest_attributes.as_deref(),
            kSecGuestAttributePid as *const _ as _,
            &*value as *const _ as _,
        )
    };

    // Obtain `SecCode` from the peer process.
    let mut sec_code = MaybeUninit::<*mut SecCode>::uninit();
    // Safety: Follows the "Create rule", and thus the object is owned by the caller. Therefore,
    // `sec_code` needs to be retained after successful initialization (see below).
    let status_sec_code = unsafe {
        SecCodeCopyGuestWithAttributes(
            None,
            guest_attributes.as_ref().map(|value| value.as_ref()),
            SecCSFlags::empty(),
            ptr::NonNull::new(sec_code.as_mut_ptr())
                // Safety: Even though the object is not yet initialized, the pointer is non-null.
                .unwrap(),
        )
    };
    if status_sec_code != 0 {
        let error = format!(
            "SecCodeCopyGuestWithAttributes failed with code: {}",
            status_sec_code
        );

        return Err(Error::new(ErrorKind::Other, error));
    }
    // Safety: `sec_code` is expected to be initialized at this point and can be retained without
    // additional checks. `CFRetained<_>` implements the `Drop` trait to release the object.
    let sec_code =
        unsafe { CFRetained::from_raw(ptr::NonNull::new_unchecked(sec_code.assume_init())) };

    // Create `SecRequirement` from the given requirement string.
    let sec_requirement = create_sec_requirement_from_requirement_string(requirement)?;

    // Validate the `SecCode` of the peer process against the `SecRequirement`.
    let mut error_check_validity: *mut CFError = ptr::null_mut();
    // Safety: Marked `unsafe` due to FFI. Input arguments are constants or `CFRetained<_>`.
    let status_check_validity = unsafe {
        SecCodeCheckValidityWithErrors(
            &sec_code,
            SecCSFlags::empty(),
            Some(&sec_requirement),
            &mut error_check_validity,
        )
    };
    if status_check_validity != 0 {
        return Err(
            // Safety: `CFError` was produced by `SecCodeCheckValidityWithErrors`, so we need to
            // trust that it is valid.
            unsafe { error_from_cf_error(error_check_validity.as_ref(), "SecCodeCheckValidity") },
        );
    }

    Ok(())
}

/// Creates a `UnixListener` for the given launchd socket name using `launch_activate_socket`. (see:
/// https://developer.apple.com/documentation/xpc/1505523-launch_activate_socket).
pub fn unix_listener_for_socket_name(name: &CString) -> Result<UnixListener, Error> {
    // Initialize variables for `launch_activate_socket` to populate.
    let mut file_descriptors: *mut c_int = ptr::null_mut();
    let mut file_descriptor_count: size_t = 0;
    // Safety: Marked `unsafe` due to FFI. `name` is passed in, so is in scope. The rest of the
    // inputs are are initialized above and in scope. `file_descriptors` is freed futher down below.
    let status = unsafe {
        launch_activate_socket(
            name.as_ptr(),
            &mut file_descriptors,
            &mut file_descriptor_count,
        )
    };
    if status != 0 {
        let error = match Error::last_os_error().raw_os_error() {
            Some(ENOENT) => {
                "There was no socket of the specified name owned by the caller".to_string()
            }
            Some(ESRCH) => "The caller isn't a process managed by launchd".to_string(),
            Some(EALREADY) => "The socket has already been activated by the caller".to_string(),
            Some(code) => format!("Unknown socket error: {}", code),
            None => "Unknown socket error".to_string(),
        };

        return Err(Error::new(ErrorKind::Other, error));
    }

    match file_descriptor_count {
        0 => {
            // No file descriptor. Return an error.
            Err(Error::new(
                ErrorKind::Other,
                format!(
                    "Launchd socket \"{}\" not found",
                    name.to_str().unwrap_or("unknown"),
                ),
            ))
        }
        1 => {
            // Get first (and only) file descriptor, and create a listener.
            //
            // Safety: Marked `unsafe` due to FFI. `file_descriptors` is expected to be allocated at
            // this point and contains one item.
            let file_descriptor = unsafe { OwnedFd::from_raw_fd(*file_descriptors) };
            // Safety: Marked `unsafe` due to FFI.
            unsafe {
                libc::free(file_descriptors.cast());
            };

            let std_listener = std::os::unix::net::UnixListener::from(file_descriptor);
            std_listener.set_nonblocking(true)?;

            UnixListener::from_std(std_listener)
        }
        n => {
            // Too many file descriptors. Close all and return an error.
            for index in 0..n {
                // Safety: Marked `unsafe` due to FFI. `file_descriptors` is expected to be
                // allocated at this point and is of known length.
                unsafe {
                    let file_descriptor = *(file_descriptors.add(index));
                    let _ = libc::close(file_descriptor);
                }
            }

            Err(Error::new(
                ErrorKind::Other,
                format!(
                    "Launchd socket \"{}\" must be unique, but found {} sockets",
                    name.to_str().unwrap_or("unknown"),
                    n
                ),
            ))
        }
    }
}
