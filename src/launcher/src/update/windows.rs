//! Update logic specific to Windows.
//!
//! Note: The `temp` directory (which contains the pre-downloaded update file) can be in two
//! locations on Windows. This happens because application data is saved to `%APPDATA%` for
//! compatibility reasons if a `ThreemaDesktop` directory has already existed there previously
//! (e.g., when updating from an older App Version), but otherwise it is saved to an
//! application-specific subdirectory in `%LOCALAPPDATA%` (since we moved to MSIX). However, in both
//! cases, the path from the application's viewpoint is `%APPDATA%`, and in the latter case, it is
//! automatically redirected to the sandboxed directory by the OS. This is a problem if we need the
//! actual full path to the real file, e.g. if we want to pass it to another application or system
//! API. This means if a path needs to be valid externally, we need to figure out if the environment
//! is sandboxed and rewrite the paths accordingly.

use std::{
    io::{Error, ErrorKind},
    os::windows::ffi::OsStrExt,
    path::{Path, PathBuf},
};

use windows::{
    core::{self as windows_core, PCWSTR},
    Foundation::Uri,
    Management::Deployment::{AddPackageOptions, DeploymentResult, PackageManager},
    Storage::ApplicationData,
    Win32::{
        Storage::FileSystem::{GetFileAttributesW, INVALID_FILE_ATTRIBUTES},
        System::Recovery::{RegisterApplicationRestart, REGISTER_APPLICATION_RESTART_FLAGS},
    },
};

use crate::{
    get_windows_appdata_dir, print_log, update::common::find_files_by_extension_in,
    util::fs::validate_file_hash,
};

/// Validate and install the first MSIX package found in "{profile_directory}/temp/update".
///
/// Responsibilities of this function:
/// - Find first `.msix` and `.msix.sha256` file in `{profile_directory}/temp/update` (downloaded by
///   the main application).
/// - Verify MSIX against checksum to guard against corruption.
/// - Register MSIX for install using the Windows `PackageManager` API.
/// - Request an app shutdown and restart from the OS, so that the update can be applied.
pub fn validate_and_install_latest_predownloaded_update(
    profile_directory: PathBuf,
) -> Result<(), Error> {
    // Look for MSIX packages in the non-sandbox-aware download location. This should always be
    // present if an update was downloaded, regardless of whether the application data is actually
    // sandboxed, because app data paths appear merged to the application when reading from inside
    // the sandbox.
    let temp_update_directory = profile_directory.join("temp").join("update");
    let mut msix = find_files_by_extension_in(&temp_update_directory, "msix")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No MSIX file found"))?
        .to_owned();
    let mut checksum = find_files_by_extension_in(&temp_update_directory, "sha256")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No checksum file found"))?
        .to_owned();

    // Check whether the MSIX package was downloaded to the sandboxed location, and adjust the path
    // accordingly.
    if let (Ok(sandboxed_msix_path), Ok(sandboxed_checksum_path)) = (
        get_sandbox_aware_path_of(msix.as_path()),
        get_sandbox_aware_path_of(checksum.as_path()),
    ) {
        print_log!(
            "Checking sandbox-aware MSIX path for file: {}",
            sandboxed_msix_path.as_path().display()
        );
        print_log!(
            "Checking sandbox-aware checksum path for file: {}",
            sandboxed_checksum_path.as_path().display()
        );

        if os_path_exists(sandboxed_msix_path.as_path())
            && os_path_exists(sandboxed_checksum_path.as_path())
        {
            print_log!("Real path of the update installer file is inside the sandbox! Updating paths accordingly");
            msix = sandboxed_msix_path;
            checksum = sandboxed_checksum_path;
        }
    };

    print_log!("Absolute MSIX installer path: {}", msix.display());
    print_log!("Absolute checksum file path: {}", checksum.display());

    // Validate MSIX installer against the checksum.
    if let Err(e) = validate_file_hash(msix.as_path(), checksum.as_path()) {
        return Err(Error::new(ErrorKind::Other, e));
    }
    print_log!("MSIX checksum validation successful");

    print_log!("Requesting install of package");
    install_msix_package(msix.as_path())
        .map(|_result| ())
        .map_err(|error| Error::new(ErrorKind::Other, error))
}

/// Returns whether a file or directory exists at the given path.
///
/// Note: This uses Windows APIs to check the real path at the OS level, and not how it is presented
/// to the sandbox.
fn os_path_exists(path: &Path) -> bool {
    let wide_path: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let lpfilename = PCWSTR::from_raw(wide_path.as_ptr());
    let attributes = unsafe { GetFileAttributesW(lpfilename) };

    attributes != INVALID_FILE_ATTRIBUTES
}

/// Transforms the given non-sandbox-aware path to a sandbox-aware path.
fn get_sandbox_aware_path_of(path: &Path) -> Result<PathBuf, Error> {
    // Get the subpath relative to `%APPDATA%`.
    let relative_path = path
        .strip_prefix(get_windows_appdata_dir())
        .map_err(|error| Error::new(ErrorKind::Other, error.to_string()))?;

    get_persistent_sandbox_app_data_base_dir().map(|value| value.join(relative_path))
}

/// Returns the sandbox-aware path to the app data base dir.
///
/// Note: This will be the actual place where app data is stored if it was only ever installed using
/// the MSIX installer.
fn get_persistent_sandbox_app_data_base_dir() -> Result<PathBuf, Error> {
    let path = ApplicationData::Current()?
        .LocalCacheFolder()?
        .Path()?
        .to_string_lossy();

    Ok(PathBuf::from(path).join("Roaming"))
}

/// Install the MSIX package at the given path.
///
/// Note: The path must be accessible by the system, so it must be prefixed with the base app data
/// sandbox path if the application is sandboxed.
fn install_msix_package(msix_path: &Path) -> windows_core::Result<DeploymentResult> {
    let package_manager = PackageManager::new()?;
    let uri = Uri::CreateUri(&windows_core::HSTRING::from(msix_path.to_str().unwrap()))?;
    let options = AddPackageOptions::new()?;
    options.SetForceAppShutdown(true)?;

    let result: windows_core::Result<()> = unsafe {
        RegisterApplicationRestart(
            None,
            REGISTER_APPLICATION_RESTART_FLAGS(0 /* Always restart */),
        )
    };
    if let Err(e) = result {
        return windows_core::Result::Err(e);
    }

    let operation = package_manager.AddPackageByUriAsync(&uri, &options)?;
    operation.get()
}
