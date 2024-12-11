use std::{
    env, fs,
    io::{Error, ErrorKind},
    path::PathBuf,
    process::Command,
};

use crate::{
    determine_app_name, print_log, update::common::find_files_by_extension_in,
    util::fs::validate_file_hash,
};

pub fn validate_and_install_latest_predownloaded_update(
    profile_directory: PathBuf,
) -> Result<(), Error> {
    let app_name = determine_app_name();

    // Find paths to DMG and checksum file
    let tmp_dir = profile_directory.join("temp");
    let update_dir = tmp_dir.join("update");
    let dmg_file = find_files_by_extension_in(&update_dir, "dmg")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No DMG file found"))?
        .to_owned();
    let checksum_file = find_files_by_extension_in(&update_dir, "sha256")
        .first()
        .ok_or(Error::new(ErrorKind::Other, "No checksum file found"))?
        .to_owned();
    print_log!("Absolute DMG image path: {}", dmg_file.display());
    print_log!("Absolute checksum file path: {}", checksum_file.display());

    let src_dir = tmp_dir.join(app_name);
    let src_app = src_dir.join(format!("{app_name}.app"));
    let dst_dir = get_current_install_dir()?;
    let dst_app = dst_dir.join(format!("{app_name}.app"));
    print_log!("Absolute source app path: {}", src_app.display());
    print_log!("Absolute destination app path: {}", dst_app.display());

    // Validate DMG image against the checksum.
    validate_file_hash(dmg_file.as_path(), checksum_file.as_path())?;
    print_log!("DMG checksum validation successful");

    print_log!("Requesting install of package");

    // Check if an (older) image is mounted already and unmount
    if src_dir.exists() {
        print_log!("Looks like last image is still mounted. Will try to unmount...");
        umount_image(&src_dir)?;
    }

    // Mount dmg image
    mount_image(&dmg_file, &src_dir)?;

    // Delete old app
    uninstall_app(&dst_app)?;

    // Copy new app
    install_app(&src_app, &dst_dir)?;

    // Unmount dmg image
    umount_image(&src_dir)?;

    Ok(())
}

fn uninstall_app(app_path: &PathBuf) -> Result<(), Error> {
    fs::remove_dir_all(app_path)
}

fn install_app(src: &PathBuf, dst: &PathBuf) -> Result<(), Error> {
    let out = Command::new("cp").arg("-a").arg(src).arg(dst).output();

    match out {
        Ok(res) => {
            if res.status.success() {
                print_log!("Copy directory successful.");
                return Ok(());
            }
            let error_msg = format!("Failed to copy directory {:?} to {:?}.", src, dst);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
        Err(e) => {
            let error_msg = format!("Failed to execute process: {}", e);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
    }
}

fn mount_image(dmg: &PathBuf, mount_point: &PathBuf) -> Result<(), Error> {
    let out = Command::new("hdiutil")
        .arg("attach")
        .arg(dmg)
        .arg("-mountpoint")
        .arg(mount_point)
        .arg("-nobrowse")
        .arg("-quiet")
        .output();

    match out {
        Ok(res) => {
            if res.status.success() {
                print_log!("Mounting DMG image successful.");
                return Ok(());
            }
            let error_msg = format!("Failed to mount {:?} image.", dmg);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
        Err(e) => {
            let error_msg = format!("Failed to execute process: {}", e);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
    }
}

fn umount_image(path: &PathBuf) -> Result<(), Error> {
    let out = Command::new("hdiutil")
        .arg("detach")
        .arg(path)
        .arg("-quiet")
        .arg("-force")
        .output();

    match out {
        Ok(res) => {
            if res.status.success() {
                print_log!("Unmounting DMG image successful.");
                return Ok(());
            }
            let error_msg = format!("Failed to unmount {:?}.", path);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
        Err(e) => {
            let error_msg = format!("Failed to execute process: {}", e);
            return Err(Error::new(ErrorKind::Other, error_msg));
        }
    }
}

// To locate the install directory (where the application bundle lives), navigate four directory levels up from the current running binary.
//
// Example: `foo/Threema Beta.app/Contents/MacOS/ThreemaDesktopLauncher` -> `foo`
fn get_current_install_dir() -> Result<PathBuf, Error> {
    env::current_exe()?
        .ancestors()
        .nth(4)
        .map(|path| path.to_path_buf())
        .ok_or_else(|| {
            Error::new(
                std::io::ErrorKind::NotFound,
                "The current install directory could not be found.",
            )
        })
}
