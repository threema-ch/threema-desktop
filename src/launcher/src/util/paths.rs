use crate::{print_error, BUILD_FLAVOR};
use home::home_dir;
use std::{
    env,
    path::{Path, PathBuf},
};

/// Return the profile directory location based on operating system:
///
/// - Linux / BSD: $XDG_DATA_HOME/ThreemaDesktop/ or ~/.local/share/ThreemaDesktop/
/// - macOS: ~/Library/Application Support/ThreemaDesktop/
/// - Windows: %APPDATA%/ThreemaDesktop/
/// - Other: ~/.ThreemaDesktop/
///
/// Note: This must match the path determined by the application in `src/electron/electron-main.ts`
/// by the function `getPersistentAppDataBaseDir`!
pub fn get_persistent_app_data_dir() -> PathBuf {
    let base_dir = get_persistent_app_data_base_dir();
    let root_directory_name = "ThreemaDesktop";

    match env::consts::OS {
        "windows" | "macos" | "linux" | "freebsd" | "dragonfly" | "netbsd" | "openbsd"
        | "solaris" => base_dir.join(root_directory_name),
        other => {
            print_error!("Unknown operating system: {}", other);
            base_dir.join(format!(".{root_directory_name}"))
        }
    }
}

/// Return the directory where application data is typically saved on a given operating system:
///
/// - Linux / BSD: $XDG_DATA_HOME/ or ~/.local/share/
/// - macOS: ~/Library/Application Support/
/// - Windows: %APPDATA%/
/// - Other: ~/
pub fn get_persistent_app_data_base_dir() -> PathBuf {
    match env::consts::OS {
        "linux" | "freebsd" | "dragonfly" | "netbsd" | "openbsd" | "solaris" => {
            let xdg_data_home = env::var("XDG_DATA_HOME")
                .unwrap_or_default()
                .trim()
                .to_string();
            if !xdg_data_home.is_empty() {
                return Path::new(&xdg_data_home).to_path_buf();
            }
            return home_dir()
                .expect("Could not determine user home directory")
                .join(".local")
                .join("share");
        }
        "macos" => home_dir()
            .expect("Could not determine user home directory")
            .join("Library")
            .join("Application Support"),
        "windows" => {
            let appdata = env::var("APPDATA").expect("No %APPDATA% found");
            if appdata.trim().is_empty() {
                panic!("%APPDATA% is empty");
            }
            return Path::new(&appdata).to_path_buf();
        }
        other => {
            print_error!("Unknown operating system: {}", other);
            return home_dir().expect("Could not determine user home directory");
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

    return format!("{BUILD_FLAVOR}-{profile}");
}
