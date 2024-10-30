use std::{env, path::PathBuf};

use home::home_dir;

use crate::{print_error, BUILD_FLAVOR};

pub fn get_windows_appdata_dir() -> PathBuf {
    if env::consts::OS != "windows" {
        panic!("%APPDATA% is only found on Windows");
    }
    let appdata = env::var("APPDATA").expect("No %APPDATA% found");
    if appdata.trim().is_empty() {
        panic!("%APPDATA% is empty");
    }

    PathBuf::from(&appdata)
}

/// Return the profile directory location based on operating system:
///
/// - Linux / BSD: $XDG_DATA_HOME/ThreemaDesktop/ or ~/.local/share/ThreemaDesktop/
/// - macOS: ~/Library/Application Support/ThreemaDesktop/
/// - Windows: %APPDATA%/ThreemaDesktop/
/// - Other: ~/.ThreemaDesktop/
///
/// Note: This must match the path determined by the application in `src/electron/electron-main.ts`
/// by the function `getPersistentAppDataBaseDir`!
pub fn get_persistent_app_data_base_dir() -> PathBuf {
    let root_directory_name = "ThreemaDesktop";
    match env::consts::OS {
        "linux" | "freebsd" | "dragonfly" | "netbsd" | "openbsd" | "solaris" => {
            let xdg_data_home = env::var("XDG_DATA_HOME")
                .unwrap_or_default()
                .trim()
                .to_string();
            if !xdg_data_home.is_empty() {
                return PathBuf::from(&xdg_data_home).join(root_directory_name);
            }

            home_dir()
                .expect("Could not determine user home directory")
                .join(".local")
                .join("share")
                .join(root_directory_name)
        }
        "macos" => home_dir()
            .expect("Could not determine user home directory")
            .join("Library")
            .join("Application Support")
            .join(root_directory_name),
        "windows" => get_windows_appdata_dir().join(root_directory_name),
        other => {
            print_error!("Unknown operating system: {}", other);
            home_dir()
                .expect("Could not determine user home directory")
                .join(format!(".{root_directory_name}"))
        }
    }
}

/// Return the name of the threema profile directory, depending on the given args and the current
/// app flavor.
pub fn get_profile_directory_name(args: &[String]) -> String {
    static PROFILE_DIRECTORY_FLAG_PREFIX: &str = "--threema-profile=";

    let profile = match args
        .iter()
        .find(|arg| arg.starts_with(PROFILE_DIRECTORY_FLAG_PREFIX))
    {
        Some(arg) => arg.trim_start_matches(PROFILE_DIRECTORY_FLAG_PREFIX),
        None => "default",
    };

    format!("{BUILD_FLAVOR}-{profile}")
}
