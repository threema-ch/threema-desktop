use std::{
    fs::read_dir,
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

use crate::{get_persistent_app_data_base_dir, print_log, util::fs::validate_file_hash};

/// Finds the latest (pre-downloaded) MSIX installer to use as an update, verifies it against the
/// respective (pre-downloaded) checksum, registers it for install using the Windows PackageManager
/// API, requests an app restart from the OS, and quits the app to apply the update.
pub fn validate_and_install_latest_predownloaded_update(
    profile_directory: PathBuf,
) -> Result<(), Error> {
    // Look for MSIX packages in the non-sandbox-aware download location. This should always be
    // present if an update was downloaded, regardless of whether the application data is actually
    // sandboxed, because app data paths appear merged to the application when reading from inside
    // the sandbox.
    let mut temp_update_directory = profile_directory.join("temp").join("update");
    let mut msixs = find_files_by_extension_in(&temp_update_directory, "msix");
    let mut checksums = find_files_by_extension_in(&temp_update_directory, "sha256");

    // Sort alphabetically, so the most recent version will be the last if there is more than one
    // MSIX.
    msixs.sort();
    checksums.sort();
    let mut msix = msixs
        .last()
        .cloned()
        .ok_or(Error::new(ErrorKind::Other, "No MSIX file found"))?;
    let mut checksum = checksums
        .last()
        .cloned()
        .ok_or(Error::new(ErrorKind::Other, "No checksum file found"))?;

    // Check whether the MSIX package was downloaded to the sandboxed location, and adjust the path
    // accordingly.
    let sandboxed_msix_path = get_sandbox_aware_path_of(msix.as_path());
    let sandboxed_checksum_path = get_sandbox_aware_path_of(checksum.as_path());
    if sandboxed_msix_path.is_ok() && sandboxed_checksum_path.is_ok() {
        let sandboxed_msix_path_unwrapped = sandboxed_msix_path.as_ref().unwrap();
        let sandboxed_checksum_path_unwrapped = sandboxed_checksum_path.as_ref().unwrap();

        print_log!(
            "Checking sandbox-aware MSIX path for file: {}",
            sandboxed_msix_path_unwrapped.as_path().display()
        );
        print_log!(
            "Checking sandbox-aware checksum path for file: {}",
            sandboxed_checksum_path_unwrapped.as_path().display()
        );

        if os_path_exists(sandboxed_msix_path_unwrapped)
            && os_path_exists(sandboxed_checksum_path_unwrapped)
        {
            print_log!("Real path of the update installer file is inside the sandbox! Updating paths accordingly");
            msix = sandboxed_msix_path_unwrapped.to_owned();
            checksum = sandboxed_checksum_path_unwrapped.to_owned();
        }
    };

    print_log!("Absolute MSIX installer path: {}", msix.display());
    print_log!("Absolute checksum file path: {}", checksum.display());

    // Validate MSIX installer against the checksum.
    let validation_result = validate_file_hash(msix.as_path(), checksum.as_path());
    if validation_result.is_err() {
        return Err(Error::new(
            ErrorKind::Other,
            validation_result.err().unwrap(),
        ));
    }
    print_log!("MSIX validation successful");

    print_log!("Requesting install of package");
    return install_msix_package(msix.as_path())
        .map(|result| ())
        .map_err(|error| Error::new(ErrorKind::Other, error));
}

/// Returns all files with the given `extension` in the given `directory`.
fn find_files_by_extension_in(directory: &Path, extension: &str) -> Vec<PathBuf> {
    let mut result = read_dir(directory).ok().and_then(|value| {
        let matches: Vec<PathBuf> = value
            .filter_map(Result::ok)
            .map(|file| file.path())
            .filter(|path| path.extension().and_then(|ext| ext.to_str()) == Some(extension))
            .collect();

        Some(matches)
    });

    return result.unwrap_or_else(Vec::new);
}

/// Returns whether a file or directory exists at the given path. Note: This uses Windows APIs to
/// check the real path at the OS level, and not how it is presented to the sandbox.
fn os_path_exists(path: &Path) -> bool {
    let wide_path: Vec<u16> = path
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    unsafe {
        let attributes = GetFileAttributesW(PCWSTR::from_raw(wide_path.as_ptr()));
        attributes != INVALID_FILE_ATTRIBUTES
    }
}

/// Transforms the given non-sandbox-aware path to a sandbox-aware path.
fn get_sandbox_aware_path_of(path: &Path) -> Result<PathBuf, Error> {
    // Get the subpath relative to `%APPDATA%`.
    let relative_path = path
        .strip_prefix(get_persistent_app_data_base_dir())
        .map_err(|error| Error::new(ErrorKind::Other, error.to_string()))?;

    return get_persistent_sandbox_app_data_base_dir().map(|value| value.join(relative_path));
}

/// Returns the sandbox-aware path to the app data base dir. This will be the actual place where app
/// data is stored if it was only ever installed using the MSIX installer.
fn get_persistent_sandbox_app_data_base_dir() -> Result<PathBuf, Error> {
    let path = ApplicationData::Current()?
        .LocalCacheFolder()?
        .Path()?
        .to_string_lossy();

    return Ok(PathBuf::from(path).join("Roaming"));
}

/// Install the MSIX package at the given path. Note: The path must be accessible by the system, so
/// it must be prefixed with the base app data sandbox path if the application is sandboxed.
fn install_msix_package(msix_path: &Path) -> windows_core::Result<DeploymentResult> {
    let package_manager = PackageManager::new()?;
    let uri = Uri::CreateUri(&windows_core::HSTRING::from(msix_path.to_str().unwrap()))?;
    let options = AddPackageOptions::new()?;
    options.SetForceAppShutdown(true)?;

    unsafe {
        let pwz_command_line: windows_core::PCWSTR = windows_core::w!("");
        let result: windows_core::Result<()> =
            RegisterApplicationRestart(pwz_command_line, REGISTER_APPLICATION_RESTART_FLAGS(0));
        if result.is_err() {
            return windows_core::Result::Err(result.expect_err("Expected an error value"));
        }
    }

    let operation = package_manager.AddPackageByUriAsync(&uri, &options)?;

    return operation.get();
}
