#![windows_subsystem = "windows"] // Prevent console window from showing up on Windows

use std::{
    env, fs,
    io::{stderr, stdout, IsTerminal},
    path::{Path, PathBuf},
    process::{self, Command, Stdio},
    time::Duration,
};

use colored::Colorize;
use home::home_dir;

// Compile-time constants
const VERSION: &str = env!("CARGO_PKG_VERSION");
const BUILD_FLAVOR: &str = env!("THREEMA_BUILD_FLAVOR"); // e.g. consumer-sandbox or work-live

// Valid build flavors
const VALID_BUILD_FLAVORS: [&str; 5] = [
    "consumer-sandbox",
    "consumer-live",
    "work-sandbox",
    "work-live",
    "work-onprem",
];

// Exit codes
const EXIT_CODE_EXIT: i32 = 0;
const EXIT_CODE_RESTART: i32 = 8;
const EXIT_CODE_DELETE_PROFILE_AND_RESTART: i32 = 9;
const EXIT_CODE_RENAME_PROFILE_AND_RESTART: i32 = 10;
const EXIT_CODE_LAUNCHER_ERROR: i32 = 20;

// Delays
const DELAY_BEFORE_ERROR_EXIT_MS: u64 = 2000;

#[cfg(windows)]
fn init_terminal() {
    let _ = colored::control::set_virtual_terminal(true);
}

#[cfg(not(windows))]
fn init_terminal() {}

/// Print a log if stdout is a terminal.
#[macro_export]
macro_rules! print_log {
    () => {{
        if stdout().is_terminal() {
            println!();
        }
    }};
    ($msg:expr) => {{
        if stdout().is_terminal() {
            println!($msg);
        }
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        if stdout().is_terminal() {
            println!($msg, $($args),*);
        }
    }}
}

/// Print an error in red if stderr is a terminal.
#[macro_export]
macro_rules! print_error {
    ($msg:expr) => {{
        if stderr().is_terminal() {
            eprintln!("{}", $msg.bright_red());
        }
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        if stderr().is_terminal() {
            eprintln!("{}", format!($msg, $($args),*).bright_red());
        }
    }}
}

fn print_usage_and_exit(launcher_path: &str) -> ! {
    if cfg!(feature = "allow_path_override") {
        print_error!(
            "Usage: {} [--launcher-help] [--launcher-version] [--launcher-target-bin <path>] [args...]",
            launcher_path
        );
    } else {
        print_error!(
            "Usage: {} [--launcher-help] [--launcher-version] [args...]",
            launcher_path
        );
    }
    process::exit(EXIT_CODE_LAUNCHER_ERROR);
}

/// Determine binary name based on operating system
fn determine_binary_name() -> &'static str {
    match env::consts::OS {
        "windows" => "ThreemaDesktop.exe",
        _other => "ThreemaDesktop",
    }
}

/// Determine profile directory location based on operating system:
///
/// - Linux / BSD: $XDG_DATA_HOME/ThreemaDesktop/ or ~/.local/share/ThreemaDesktop/
/// - macOS: ~/Library/Application Support/ThreemaDesktop/
/// - Windows: %APPDATA%/ThreemaDesktop/
/// - Other: ~/.ThreemaDesktop/
///
/// Note: This must match the path determined by the application in `src/electron/electron-main.ts`
/// by the function `getPersistentAppDataBaseDir`!
fn determine_profile_directory_location() -> PathBuf {
    let root_directory_name = "ThreemaDesktop";
    match env::consts::OS {
        "linux" | "freebsd" | "dragonfly" | "netbsd" | "openbsd" | "solaris" => {
            let xdg_data_home = env::var("XDG_DATA_HOME")
                .unwrap_or_default()
                .trim()
                .to_string();
            if !xdg_data_home.is_empty() {
                return Path::new(&xdg_data_home).join(root_directory_name);
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
        "windows" => {
            let appdata = env::var("APPDATA").expect("No %APPDATA% found");
            if appdata.trim().is_empty() {
                panic!("%APPDATA% is empty");
            }
            Path::new(&appdata).join(root_directory_name)
        }
        other => {
            print_error!("Unknown operating system: {}", other);
            home_dir()
                .expect("Could not determine user home directory")
                .join(format!(".{root_directory_name}"))
        }
    }
}

fn determine_profile_directory(args: &[String]) -> PathBuf {
    static PROFILE_DIRECTORY_FLAG_PREFIX: &str = "--threema-profile=";

    let profile_directory_location = determine_profile_directory_location();
    let profile = match args
        .iter()
        .find(|arg| arg.starts_with(PROFILE_DIRECTORY_FLAG_PREFIX))
    {
        Some(arg) => arg.trim_start_matches(PROFILE_DIRECTORY_FLAG_PREFIX),
        None => "default",
    };

    profile_directory_location.join(format!("{BUILD_FLAVOR}-{profile}"))
}

/// Append a suffix to a path and return the modified path
fn append_to_path(p: PathBuf, s: &str) -> PathBuf {
    let mut p = p.into_os_string();
    p.push(s);
    p.into()
}

fn main() {
    init_terminal();

    // Assertions
    assert!(
        VALID_BUILD_FLAVORS.contains(&BUILD_FLAVOR),
        "Invalid build flavor: {BUILD_FLAVOR:?}. This is a build configuration error, set the correct THREEMA_BUILD_FLAVOR env var when building!"
    );

    // Print header
    let color = if BUILD_FLAVOR.starts_with("work-") {
        "blue"
    } else {
        "green"
    };
    print_log!("{}", " _____ _                         ".color(color));
    print_log!("{}", "|_   _| |_ ___ ___ ___ _____ ___ ".color(color));
    print_log!("{}", "  | | |   |  _| -_| -_|     | .'|".color(color));
    print_log!("{}", "  |_| |_|_|_| |___|___|_|_|_|__,|".color(color));
    print_log!();
    print_log!("Desktop launcher v{} ({})", VERSION, BUILD_FLAVOR);

    // Get args
    let mut args: Vec<String> = env::args().collect();

    // Extract launcher binary path
    let launcher_path = args.remove(0);

    // Show help or version
    if args.iter().any(|arg| arg == "--launcher-help") {
        print_usage_and_exit(&launcher_path);
    }
    if args.iter().any(|arg| arg == "--launcher-version") {
        process::exit(0);
    }

    // Determine target binary path.
    //
    // If overridden through "--launcher-target-bin <path>" parameter, use that path.
    // Otherwise, fall back to a default binary name adjacent to the launcher.
    let mut target_path_override = None;
    if cfg!(feature = "allow_path_override") {
        if let Some(i) = args.iter().position(|arg| arg == "--launcher-target-bin") {
            if args.len() > i + 1 {
                args.remove(i);
                target_path_override = Some(args.remove(i));
            }
        }
    }
    let target_path = match env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
    {
        Some(dir) => {
            dir.join(target_path_override.unwrap_or_else(|| determine_binary_name().to_string()))
        }
        None => {
            print_error!("Could not determine current executable directory");
            process::exit(EXIT_CODE_LAUNCHER_ERROR);
        }
    };
    print_log!("Launching Threema Desktop through {:?}", target_path);

    // Ensure that target path exists
    if !target_path.exists() {
        print_error!("Error: Target path {:?} not found", target_path);
        process::exit(EXIT_CODE_LAUNCHER_ERROR);
    }
    if !target_path.is_file() {
        print_error!("Error: Target path {:?} is not a file", target_path);
        process::exit(EXIT_CODE_LAUNCHER_ERROR);
    }

    // Determine profile directory
    let profile_directory = determine_profile_directory(args.as_slice());
    print_log!("Profile directory: {:?}", profile_directory);

    loop {
        let now = time::OffsetDateTime::now_utc();
        print_log!("Current timestamp (UTC): {}", now);
        print_log!("------");

        // Launch child process
        //
        // Note: If we just use `Stdio::inherit()` for stdout/stderr, then we get crashes from the
        // NodeJS console logger when it tries to write to stdout while stdout is not writable (e.g.
        // when not launching the application from a terminal).
        //
        // This is avoided by using the `is_terminal()` check, however we lose the ability to pipe
        // output to a file or to another application. But that's not a big issue since we have a
        // file logger.
        let mut child = match Command::new(&target_path)
            .args(&args)
            .stdin(Stdio::null())
            .stdout(if stdout().is_terminal() {
                Stdio::inherit()
            } else {
                Stdio::null()
            })
            .stderr(if stderr().is_terminal() {
                Stdio::inherit()
            } else {
                Stdio::null()
            })
            .spawn()
        {
            Ok(child) => child,
            Err(e) => {
                print_error!("Failed to launch target binary: {}", e);
                process::exit(EXIT_CODE_LAUNCHER_ERROR);
            }
        };

        // Wait for completion
        let exit_code = match child.wait() {
            Ok(status) => {
                print_log!("Target binary exited with status {}", status);
                status.code()
            }
            Err(e) => {
                print_error!("Error while waiting for child process: {}", e);
                process::exit(EXIT_CODE_LAUNCHER_ERROR);
            }
        };

        // Perform some actions depending on exit code
        match exit_code {
            Some(EXIT_CODE_EXIT) => {
                break; // Successful closing
            }
            Some(EXIT_CODE_RESTART) => {
                print_log!("------");
                print_log!("Restarting");
                continue;
            }
            Some(EXIT_CODE_DELETE_PROFILE_AND_RESTART) => {
                print_log!("------");
                print_log!(
                    "{}",
                    format!("Removing profile directory at {profile_directory:?}!").yellow()
                );
                if let Err(e) = fs::remove_dir_all(&profile_directory) {
                    print_error!("Failed to remove profile directory: {:#}", e);
                    std::thread::sleep(Duration::from_millis(DELAY_BEFORE_ERROR_EXIT_MS));
                    process::exit(EXIT_CODE_LAUNCHER_ERROR);
                }
                print_log!("Restarting");
                continue;
            }
            Some(EXIT_CODE_RENAME_PROFILE_AND_RESTART) => {
                // Determine renamed path by appending a dot and the current unix timestamp
                let now = time::OffsetDateTime::now_utc();
                let renamed_path = append_to_path(
                    profile_directory.clone(),
                    &format!(".{}", now.unix_timestamp()),
                );

                // Log and rename
                print_log!("------");
                print_log!(
                    "{}",
                    format!(
                        "Moving profile directory at {profile_directory:?} to {renamed_path:?}!",
                    )
                    .yellow()
                );
                if let Err(e) = fs::rename(&profile_directory, renamed_path) {
                    print_error!("Failed to rename profile directory: {:#}", e);
                    std::thread::sleep(Duration::from_millis(DELAY_BEFORE_ERROR_EXIT_MS));
                    process::exit(EXIT_CODE_LAUNCHER_ERROR);
                }
                print_log!("Restarting");
                continue;
            }
            Some(other) => {
                print_error!("Unexpected exit code: {}", other);
                std::thread::sleep(Duration::from_millis(DELAY_BEFORE_ERROR_EXIT_MS));
                process::exit(other);
            }
            None => {
                print_error!("Missing exit code");
                std::thread::sleep(Duration::from_millis(DELAY_BEFORE_ERROR_EXIT_MS));
                process::exit(EXIT_CODE_LAUNCHER_ERROR);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_append_to_path() {
        let path = PathBuf::from("/usr/bin/cp");
        let updated_path = append_to_path(path, ".old");
        assert_eq!(updated_path.to_str().unwrap(), "/usr/bin/cp.old");
    }
}
