use std::{
    io::{Error, ErrorKind},
    path::Path,
};

use block2::RcBlock;
use objc2_app_kit::{NSRunningApplication, NSWorkspace, NSWorkspaceOpenConfiguration};
use objc2_foundation::{NSError, NSString, NSURL};

/// Launch the app package at the given `path`.
pub fn launch_app(app_path: &Path) -> Result<(), Error> {
    let app_path_str = app_path.to_str().ok_or(Error::new(
        ErrorKind::Other,
        "Could not convert \"app_path\" to a \"&str\"",
    ))?;

    // Safety: Marked `unsafe` due to FFI. Returns `Retained`, which implements the `Drop` trait to
    // release the object.
    let app_path_url =
        unsafe { NSURL::fileURLWithPath_isDirectory(&NSString::from_str(app_path_str), true) };

    // Safety: Marked `unsafe` due to FFI. Returns `Retained`, which implements the `Drop` trait to
    // release the object.
    let workspace_open_configuration = unsafe { NSWorkspaceOpenConfiguration::new() };

    // Safety: `workspace_open_configuration` is initialized just above and all arguments are
    // constant.
    unsafe { workspace_open_configuration.setCreatesNewApplicationInstance(true) };

    println!("Constructing application launch completion handler");
    let completion_handler = RcBlock::new(|app: *mut NSRunningApplication, error: *mut NSError| {
        if !error.is_null() {
            // Safety: `error` is expected to not be a null pointer at this point.
            let description = unsafe { error.as_ref() }
                .map(|value| value.localizedDescription())
                .unwrap_or(NSString::from_str("unknown error"));
            eprintln!("Failed to launch application: {}", description);
        } else if app.is_null() {
            eprintln!("Failed to launch application: unknown error");
        } else {
            println!("Successfully completed launching application");
        }
    });

    println!("Launching application at path: {}", app_path_str);
    // Safety: Marked `unsafe` due to FFI. Input arguments are `Retained<_>`.
    unsafe {
        NSWorkspace::sharedWorkspace().openApplicationAtURL_configuration_completionHandler(
            &app_path_url,
            &workspace_open_configuration,
            Some(&completion_handler),
        )
    };

    Ok(())
}
