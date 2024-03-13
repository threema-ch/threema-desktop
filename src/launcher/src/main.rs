#![windows_subsystem = "windows"] // Prevent console window from showing up on Windows

use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{self, Command, Output, Stdio},
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
const EXIT_CODE_RESTART: i32 = 8;
const EXIT_CODE_DELETE_PROFILE_AND_RESTART: i32 = 9;
const EXIT_CODE_LAUNCHER_ERROR: i32 = 20;

// Delays
const DELAY_BEFORE_ERROR_EXIT_MS: u64 = 2000;

#[cfg(windows)]
fn init_terminal() {
    let _ = colored::control::set_virtual_terminal(true);
}

#[cfg(not(windows))]
fn init_terminal() {}

/// Print an error in red.
#[macro_export]
macro_rules! print_error {
    ($msg:expr) => {{
        eprintln!("{}", $msg.bright_red());
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        eprintln!("{}", format!($msg, $($args),*).bright_red());
    }}
}

fn print_usage_and_exit(launcher_path: &str) -> ! {
    if cfg!(feature = "allow_path_override") {
        print_error!(
            "Usage: {} [-h|--help] [--version] [--target-bin <path>] [args...]",
            launcher_path
        );
    } else {
        print_error!("Usage: {} [-h|--help] [--version] [args...]", launcher_path);
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
    println!("{}", " _____ _                         ".color(color));
    println!("{}", "|_   _| |_ ___ ___ ___ _____ ___ ".color(color));
    println!("{}", "  | | |   |  _| -_| -_|     | .'|".color(color));
    println!("{}", "  |_| |_|_|_| |___|___|_|_|_|__,|".color(color));
    println!();
    println!("Desktop launcher v{VERSION} ({BUILD_FLAVOR})");

    // Get args
    let mut args: Vec<String> = env::args().collect();

    // Extract launcher binary path
    let launcher_path = args.remove(0);

    // Show help or version
    if args.iter().any(|arg| arg == "-h" || arg == "--help") {
        print_usage_and_exit(&launcher_path);
    }
    if args.iter().any(|arg| arg == "--version") {
        process::exit(0);
    }

    // Determine target binary path.
    //
    // If overridden through "--target-bin <path>" parameter, use that path.
    // Otherwise, fall back to a default binary name adjacent to the launcher.
    let mut target_path_override = None;
    if cfg!(feature = "allow_path_override") {
        if let Some(i) = args.iter().position(|arg| arg == "--target-bin") {
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
    println!("Launching Threema Desktop through {target_path:?}");

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
    println!("Profile directory: {profile_directory:?}");

    loop {
        // Launch child process and wait for completion
        let now = time::OffsetDateTime::now_utc();
        println!("Current timestamp (UTC): {now}");
        println!("------");
        let exit_code = match Command::new(&target_path)
            .args(&args)
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .output()
        {
            Ok(Output { status, .. }) => {
                println!("Target binary exited with status {status}");
                status.code()
            }
            Err(e) => {
                print_error!("Failed to launch target binary: {}", e);
                process::exit(EXIT_CODE_LAUNCHER_ERROR);
            }
        };

        // Perform some actions depending on exit code
        match exit_code {
            Some(EXIT_CODE_RESTART) => {
                println!("------");
                println!("Restarting");
                continue;
            }
            Some(EXIT_CODE_DELETE_PROFILE_AND_RESTART) => {
                println!("------");
                println!(
                    "{}",
                    format!("Removing profile directory at {profile_directory:?}!").yellow()
                );
                if let Err(e) = fs::remove_dir_all(&profile_directory) {
                    print_error!("Failed to remove profile directory: {:#}", e);
                    std::thread::sleep(Duration::from_millis(DELAY_BEFORE_ERROR_EXIT_MS));
                    process::exit(EXIT_CODE_LAUNCHER_ERROR);
                }
                println!("Restarting");
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
