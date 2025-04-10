use common::{
    ipc::message::{ipc_read_message, ipc_write_message, IPCCommandMessage, IPCResponseMessage},
    util::{
        constants::{determine_app_name, determine_app_rdn},
        macos::{error_from_cf_error, toll_free_bridge_cf_to_ns, toll_free_bridge_ns_to_cf},
    },
};
use const_format::formatcp;
use objc2::rc::Retained;
use objc2_core_foundation::{CFBundleCopyInfoDictionaryForURL, CFError, CFRetained, CFString};
use objc2_foundation::{NSArray, NSBundle, NSDictionary, NSString, NSURL};
use objc2_security::{
    errAuthorizationSuccess, AuthorizationCopyRights, AuthorizationCreate, AuthorizationFlags,
    AuthorizationFree, AuthorizationFreeItemSet, AuthorizationItem, AuthorizationItemSet,
    AuthorizationOpaqueRef, AuthorizationRef, AuthorizationRights,
};
use objc2_service_management::kSMDomainSystemLaunchd;
#[allow(deprecated)]
use objc2_service_management::SMJobBless;
#[allow(deprecated)]
use objc2_service_management::SMJobCopyDictionary;
use std::{
    cmp::min,
    env,
    ffi::CString,
    io::{Error, ErrorKind},
    mem::MaybeUninit,
    path::PathBuf,
    process::{self, Command},
    ptr::{self, NonNull},
};

use tokio::{
    net::UnixStream,
    time::{sleep, Duration},
};

use crate::{print_log, update::common::find_files_by_extension_in, util::fs::validate_file_hash};

const HELPER_BINARY_NAME: &str = formatcp!("{}-helper", determine_app_rdn());

/// Path to the IPC socket of the privileged `launchd` helper daemon.
const IPC_SOCKET_PATH: &str = formatcp!("/var/run/{}-helper.sock", determine_app_rdn());

/// Validate and install the first DMG image found in "{profile_directory}/temp/update".
///
/// Responsibilities of this function:
/// - Find first `.dmg` and `.dmg.sha256` file in `{profile_directory}/temp/update` (downloaded by
///   the main application).
/// - Verify `.dmg` against checksum to guard against corruption.
/// - Mount `.dmg` to a temporary mount point.
/// - Install `.app` package contained in the mounted `.dmg` using a privileged helper tool.
pub async fn validate_and_install_latest_predownloaded_update(
    profile_directory: PathBuf,
) -> Result<(), Error> {
    let app_name = determine_app_name();

    // Find paths to the downloaded DMG and checksum file in the profile directory.
    let temp_update_directory = profile_directory.join("temp").join("update");
    let dmg = find_files_by_extension_in(&temp_update_directory, "dmg")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No DMG file found"))?
        .to_owned();
    let checksum = find_files_by_extension_in(&temp_update_directory, "sha256")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No checksum file found"))?
        .to_owned();
    print_log!("Absolute DMG file path: {}", dmg.display());
    print_log!("Absolute checksum file path: {}", checksum.display());

    let temp_mount_directory = profile_directory.join("temp").join("mount");
    let source_app = temp_mount_directory.join(format!("{app_name}.app"));
    let destination_app = get_current_install_dir()?.join(format!("{app_name}.app"));
    print_log!("Absolute source app path: {}", source_app.display());
    print_log!(
        "Absolute destination app path: {}",
        destination_app.display()
    );

    // Validate DMG against the checksum.
    print_log!("Validating DMG checksum");
    validate_file_hash(dmg.as_path(), checksum.as_path())?;
    print_log!("Checksum validation successful");
    print_log!("Starting update install");

    // Check if an (older) image is mounted already and unmount.
    if temp_mount_directory.exists() {
        print_log!("Looks like last image is still mounted. Will try to unmount...");
        umount_image(&temp_mount_directory)?;
    }

    print_log!("Mounting update image");
    mount_image(&dmg, &temp_mount_directory)?;

    print_log!("Installing update using elevated privileges");
    install_app_privileged(&source_app, &destination_app).await?;

    print_log!("Unmounting update image");
    umount_image(&temp_mount_directory)?;

    Ok(())
}

/// Install the `.app` package at the given `source_path` to the given `destination_path`.
async fn install_app_privileged(
    source_path: &PathBuf,
    destination_path: &PathBuf,
) -> Result<(), Error> {
    // Get version number of the helper in the bundle. This is expected to be known.
    let bundled_helper_version = get_bundled_helper_version(HELPER_BINARY_NAME)?;
    print_log!("Bundled helper version: {}", bundled_helper_version);

    // Get the version number of the currently installed helper (which is not guaranteed to be
    // known, e.g. if the helper was never installed before).
    let installed_helper_version_result = get_installed_helper_version(HELPER_BINARY_NAME);
    let installed_helper_version = match installed_helper_version_result {
        Ok(ref version) => version.as_str(),
        _ => "unknown",
    };
    print_log!(
        "Currently installed helper version: {}",
        installed_helper_version
    );

    if installed_helper_version_result.is_err()
        || bundled_helper_version != installed_helper_version_result.unwrap()
    {
        print_log!("Requesting authorization to bless helper application");

        // Obtain authorization for blessing helpers by showing an authorization prompt to the user.
        //
        // Safety: `authorization_ref` and `authorization_item_set_ref` must be freed if no longer
        // used. This is done further down below.
        let (authorization_ref, authorization_item_set_ref) =
            unsafe { authorize_right_with_prompt("com.apple.ServiceManagement.blesshelper") }?;
        print_log!("Authorization granted by user");

        // Bless helper application.
        print_log!("Blessing helper daemon using authorization");
        // Safety: If `authorize_right_with_prompt` returns `Ok`, authorization was successful and
        // `authorization_ref` is expected to be valid.
        let blessed = unsafe { bless_helper(HELPER_BINARY_NAME, authorization_ref) };

        // Free authorization references.
        if !authorization_item_set_ref.is_null() {
            print_log!("Freeing AuthorizationItemSet");
            // Safety: `authorization_item_set_ref` is expected to be non-null at this point.
            unsafe {
                AuthorizationFreeItemSet(ptr::NonNull::new(authorization_item_set_ref).unwrap())
            };
        }
        if !authorization_ref.is_null() {
            print_log!("Freeing AuthorizationRef");
            // Safety: `authorization_ref` is expected to be non-null at this point.
            unsafe { AuthorizationFree(authorization_ref, AuthorizationFlags::DestroyRights) };
        }

        blessed?;
        print_log!("Successfully installed helper application, and freed authorization references");
    }

    // Helper is blessed, so we can open a connection to the helper socket.
    print_log!("Connecting to helper daemon IPC socket");
    let mut stream = connect_with_retry_backoff(
        IPC_SOCKET_PATH,
        5,
        Duration::from_millis(500),
        Duration::from_secs(5),
    )
    .await?;

    // Send command message to replace the app and await the response.
    let message = IPCCommandMessage::ReplaceAppAtomic {
        source_path: source_path.to_owned(),
        destination_path: destination_path.to_owned(),
    };
    print_log!("ReplaceAppAtomic: Sending command message to helper");
    let response = tokio::time::timeout(Duration::from_secs(10), async {
        ipc_write_message(&mut stream, &message).await?;
        ipc_read_message::<IPCResponseMessage>(&mut stream).await
    })
    .await??;

    print_log!("ReplaceAppAtomic: Response received from helper");
    match response {
        IPCResponseMessage::Ok => {
            print_log!("IPC: Command completed successfully");
        }
        IPCResponseMessage::Err => {
            return Err(Error::new(
                ErrorKind::Other,
                "IPC: Error response received from helper",
            ))
        }
    };

    // Send command message to relaunch the app, then exit this process. There's no need to wait for
    // a response, because the helper will wait for this process to exit before continuing to
    // process the command.
    let message = IPCCommandMessage::WaitForExitAndLaunch {
        pid: process::id(),
        app_path: destination_path.to_owned(),
    };
    print_log!("WaitForExitAndLaunch: Sending command message to helper");
    tokio::time::timeout(Duration::from_secs(10), async {
        ipc_write_message(&mut stream, &message).await
    })
    .await??;

    Ok(())
}

/// Returns the version number of the currently installed helper with the given `identitier`.
/// Otherwise, returns `Err`, e.g., if no installed helper was found with the given identitier or
/// the details could not be read.
fn get_installed_helper_version(identitier: &str) -> Result<String, Error> {
    // Get information about the installed helper job. This is similar to what would be returned
    // when querying `sudo launchctl print system/{HELPER_BINARY_NAME}`.
    //
    // Safety: Follows the "Create rule", and thus returns a `Retained<_>` owned by the caller,
    // which implements the `Drop` trait to release the object. Input arguments are constants or
    // `CFRetained<_>`.
    let helper_details: Retained<NSDictionary> = unsafe {
        #[allow(deprecated)]
        SMJobCopyDictionary(
            kSMDomainSystemLaunchd,
            Some(&CFString::from_str(identitier)),
        )
        .map(|value| toll_free_bridge_cf_to_ns(&value))
    }
    .ok_or(Error::new(
        ErrorKind::Other,
        format!(
            "Failed to obtain job details of helper job with identifier: {}",
            identitier
        ),
    ))?;

    // Get the path of the installed helper from its job details.
    let helper_path = helper_details
        .objectForKey(&NSString::from_str("ProgramArguments"))
        // `ProgramArguments` is expected to be an array of strings.
        .and_then(|program_arguments| program_arguments.downcast::<NSArray>().ok())
        .and_then(|program_arguments| program_arguments.firstObject())
        // `ProgramArguments` array is expected to contain strings.
        .and_then(|helper_path| helper_path.downcast::<NSString>().ok())
        .ok_or(Error::new(
            ErrorKind::Other,
            format!(
                "Failed to read install path of helper job with identifier: {}",
                identitier
            ),
        ))?;
    // Safety: Marked `unsafe` due to FFI. Inputs and outputs are `Retained<_>`.
    let helper_url = unsafe { NSURL::fileURLWithPath(&helper_path) };
    print_log!("Installed helper URL: {:?}", helper_url);

    // Get `Info.plist` of the installed helper.
    //
    // Safety: Follows the "Create rule", and thus returns a `Retained<_>` owned by the caller,
    // which implements the `Drop` trait to release the object. The input argument is also
    // `Retained<_>`.
    let info_plist: Retained<NSDictionary> = unsafe {
        CFBundleCopyInfoDictionaryForURL(Some(&toll_free_bridge_ns_to_cf(&helper_url)))
            .map(|value| toll_free_bridge_cf_to_ns(&value))
    }
    .ok_or(Error::new(
        ErrorKind::Other,
        format!(
            "Failed to obtain Info.plist of helper binary with URL: {:?}",
            helper_url
        ),
    ))?;

    // Get currently installed version number from `Info.plist`.
    info_plist
        .objectForKey(&NSString::from_str("CFBundleVersion"))
        // `CFBundleVersion` is expected to be a string.
        .and_then(|cf_bundle_version| cf_bundle_version.downcast::<NSString>().ok())
        .map(|value| value.to_string())
        .ok_or(Error::new(
            ErrorKind::Other,
            "Failed to read version of the currently installed helper",
        ))
}

/// Returns the version number of the helper binary contained in the app bundle (in
/// `Contents/Library/LaunchServices/`) with the given `binary_name`. Otherwise, returns `Err`,
/// e.g., if no helper binary was found in the bundle with the given name or the details could not
/// be read.
fn get_bundled_helper_version(binary_name: &str) -> Result<String, Error> {
    let app_bundle = NSBundle::mainBundle();
    // Safety: Marked `unsafe` due to FFI. Returned value is `Retained<_>`, which implements the
    // `Drop` trait to release the object.
    let app_bundle_url = unsafe { app_bundle.bundleURL() };
    print_log!("App bundle URL: {:?}", app_bundle_url);

    let helper_path_relative = format!("Contents/Library/LaunchServices/{}", binary_name);
    // Safety: Marked `unsafe` due to FFI. The input argument and the returned value is
    // `Retained<_>`, which implements the `Drop` trait to release the object.
    let helper_url = unsafe {
        app_bundle_url.URLByAppendingPathComponent(&NSString::from_str(&helper_path_relative))
    }
    .ok_or(Error::new(
        ErrorKind::Other,
        format!(
            "Failed to construct URL for helper binary in app bundle: {}",
            helper_path_relative
        ),
    ))?;

    // Get `Info.plist` of the bundled helper.
    //
    // Safety: Follows the "Create rule", and thus returns a `Retained<_>` owned by the caller,
    // which implements the `Drop` trait to release the object. The input argument is also
    // `Retained<_>`.
    let info_plist: Retained<NSDictionary> = unsafe {
        CFBundleCopyInfoDictionaryForURL(Some(&toll_free_bridge_ns_to_cf(&helper_url)))
            .map(|value| toll_free_bridge_cf_to_ns(&value))
    }
    .ok_or(Error::new(
        ErrorKind::Other,
        format!(
            "Failed to obtain Info.plist of helper binary in app bundle at URL: {:?}",
            helper_url
        ),
    ))?;

    // Get currently installed version number from `Info.plist`.
    info_plist
        .objectForKey(&NSString::from_str("CFBundleVersion"))
        // `CFBundleVersion` is expected to be a string.
        .and_then(|cf_bundle_version| cf_bundle_version.downcast::<NSString>().ok())
        .map(|value| value.to_string())
        .ok_or(Error::new(
            ErrorKind::Other,
            "Failed to read version of the currently installed helper",
        ))
}

/// Authorize right with the given `name` using Apple's Security framework. This will display an
/// authentication prompt to the user and ask them to authenticate as an admin.
///
/// # Safety
///
/// Important: The caller must make sure to free the returned `AuthorizationOpaqueRef` using
/// `AuthorizationFree`, and the returned `AuthorizationItemSet` using `AuthorizationFreeItemSet`
/// when they are no longer used.
unsafe fn authorize_right_with_prompt(
    name: &str,
) -> Result<(*const AuthorizationOpaqueRef, *mut AuthorizationItemSet), Error> {
    let authorization_flags = AuthorizationFlags::Defaults
        | AuthorizationFlags::InteractionAllowed
        | AuthorizationFlags::PreAuthorize
        | AuthorizationFlags::ExtendRights;

    // Create authorization object.
    let mut authorization_ref = MaybeUninit::<AuthorizationRef>::uninit();
    // Safety: Follows the "Create rule", and thus `authorization_ref` is owned by the caller.
    // Because the `authorization_ref` is returned from the containing function and we don't retain
    // it (so that it can be freed manually), the responsibility is passed further up (see safety
    // section of the containing function). All other input arguments are constants.
    let status_authorization_create = unsafe {
        AuthorizationCreate(
            ptr::null(),
            ptr::null(),
            authorization_flags,
            authorization_ref.as_mut_ptr(),
        )
    };
    if status_authorization_create != errAuthorizationSuccess {
        return Err(Error::new(
            ErrorKind::Other,
            format!(
                "AuthorizationCreate failed with code: {}",
                status_authorization_create
            ),
        ));
    }

    // Create `AuthorizationItemSet`.
    let authorization_name = CString::new(name)?;
    let authorization_items = [AuthorizationItem {
        name: authorization_name.as_ptr(),
        valueLength: 0,
        value: ptr::null_mut(),
        flags: 0,
    }];
    let mut authorization_item_set = AuthorizationRights {
        count: 1,
        items: authorization_items.as_ptr() as *mut _,
    };

    // Preauthorize.
    //
    // Safety: `authorization_ref` is expected to be initialized at this point, see status check
    // further above.
    let authorization_ref = unsafe { authorization_ref.assume_init() };
    let mut authorized_rights = MaybeUninit::<*mut AuthorizationRights>::uninit();
    // Safety: Follows the "Create rule", and thus `authorized_rights` is owned by the caller.
    // Because the `authorized_rights` is returned from the containing function and we don't retain
    // it (so that it can be freed manually), the responsibility is passed further up (see safety
    // section of the containing function). All other input arguments are constants, or were already
    // checked before.
    let status_authorization_copy_rights = unsafe {
        AuthorizationCopyRights(
            authorization_ref,
            NonNull::new(&mut authorization_item_set)
                // Safety: Expected to be non-null, because it's initialized just above.
                .unwrap(),
            ptr::null(),
            authorization_flags,
            authorized_rights.as_mut_ptr(),
        )
    };
    if status_authorization_copy_rights != errAuthorizationSuccess {
        return Err(Error::new(
            ErrorKind::Other,
            format!(
                "AuthorizationCopyRights failed with code: {}",
                status_authorization_copy_rights
            ),
        ));
    }

    Ok((
        authorization_ref,
        // Safety: `authorized_rights` is expected to be initialized at this point, see status check
        // above.
        unsafe { authorized_rights.assume_init() },
    ))
}

/// Bless a privileged helper application with the given `name` using `SMJobBless`.
///
/// # Safety
///
/// Important: The caller must make sure that the given `authorization_ref` points to a non-null,
/// valid authorization object, which at least contains the
/// `com.apple.ServiceManagement.blesshelper` right.
unsafe fn bless_helper(
    name: &str,
    authorization_ref: *const AuthorizationOpaqueRef,
) -> Result<(), Error> {
    let label = CFString::from_str(name);
    let mut error: *mut CFError = ptr::null_mut();
    // Safety: It's the responsibility of the caller to ensure that the given `authorization_ref` is
    // valid. All other input arguments are constants or `CFRetained<_>`.
    let success = unsafe {
        #[allow(deprecated)]
        SMJobBless(
            kSMDomainSystemLaunchd,
            Some(CFRetained::<CFString>::as_ptr(&label).as_ref()),
            authorization_ref,
            &mut error,
        )
    };
    if !success {
        return Err(
            // Safety: `CFError` was produced by `SMJobBless`, so we need to trust that it is valid.
            unsafe { error_from_cf_error(error.as_ref(), "SMJobBless") },
        );
    }

    Ok(())
}

/// Connect to the given `socket_path` (of a unix socket) using an exponential backoff strategy, and
/// return the resulting `UnixStream`.
async fn connect_with_retry_backoff(
    socket_path: &str,
    max_retries: u32,
    initial_delay: Duration,
    max_delay: Duration,
) -> Result<UnixStream, Error> {
    let mut delay = initial_delay;
    let mut attempts = 0;

    loop {
        match UnixStream::connect(socket_path).await {
            Ok(stream) => {
                print_log!("Successfully connected to helper daemon IPC socket");
                return Ok(stream);
            }
            Err(err) => {
                attempts += 1;
                if attempts >= max_retries {
                    print_log!("Failed to connect after {} attempts", attempts);
                    return Err(err);
                }

                print_log!(
                    "Connection attempt {} failed, retrying in {:?}...",
                    attempts,
                    delay
                );
                sleep(delay).await;

                // Increase delay exponentially.
                delay = min(delay * 2, max_delay);
            }
        }
    }
}

/// Mounts the DMG image at the given `path` to the given `mount_path`.
fn mount_image(path: &PathBuf, mount_path: &PathBuf) -> Result<(), Error> {
    let result = Command::new("hdiutil")
        .arg("attach")
        .arg(path)
        .arg("-mountpoint")
        .arg(mount_path)
        .arg("-nobrowse")
        .arg("-quiet")
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                print_log!("Successfully mounted image at path: {}", path.display());
                return Ok(());
            }
            let message = format!(
                "Failed to mount image at path: {} to path: {}",
                path.display(),
                mount_path.display()
            );
            Err(Error::new(ErrorKind::Other, message))
        }
        Err(error) => {
            let message = format!("Mount process failed: {}", error);
            Err(Error::new(ErrorKind::Other, message))
        }
    }
}

/// Unmounts the DMG image mounted at the given `path`.
fn umount_image(path: &PathBuf) -> Result<(), Error> {
    let result = Command::new("hdiutil")
        .arg("detach")
        .arg(path)
        .arg("-quiet")
        .arg("-force")
        .output();

    match result {
        Ok(output) => {
            if output.status.success() {
                print_log!("Successfully unmounted image at path: {}", path.display());
                return Ok(());
            }
            let message = format!("Failed to unmount image at path: {}", path.display());
            Err(Error::new(ErrorKind::Other, message))
        }
        Err(error) => {
            let message = format!("Unmount process failed: {}", error);
            Err(Error::new(ErrorKind::Other, message))
        }
    }
}

/// Returns the install directory of the app bundle by navigating four directory levels up from the
/// currently running binary (e.g.,
/// `foo/Threema Beta.app/Contents/MacOS/ThreemaDesktopLauncher` -> `foo`).
fn get_current_install_dir() -> Result<PathBuf, Error> {
    env::current_exe()?
        .ancestors()
        .nth(4)
        .map(|path| path.to_path_buf())
        .ok_or_else(|| {
            Error::new(
                ErrorKind::NotFound,
                "Install directory of the app bundle could not be found",
            )
        })
}
