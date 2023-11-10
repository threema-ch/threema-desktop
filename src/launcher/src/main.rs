use std::{
    env, fs,
    path::{Path, PathBuf},
    process::{self, Command, Output, Stdio},
};

use home::home_dir;

// Compile-time constants
const VERSION: &str = env!("CARGO_PKG_VERSION");
const BUILD_FLAVOR: &str = env!("THREEMA_BUILD_FLAVOR"); // e.g. consumer-sandbox or work-live
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

/// Print an error in red.
#[macro_export]
macro_rules! print_error {
    ($msg:expr) => {{
        eprint!("\x1b[91m");
        eprint!($msg);
        eprintln!("\x1b[0m");
    }};
    ($msg:expr, $($args:expr),* $(,)?) => {{
        eprint!("\x1b[91m");
        eprint!($msg, $($args),*);
        eprintln!("\x1b[0m");
    }}
}

fn print_usage_and_exit(launcher_path: &str) -> ! {
    print_error!(
        "Usage: {} [-h|--help] [--version] <path-to-threema-desktop> [args...]",
        launcher_path
    );
    process::exit(EXIT_CODE_LAUNCHER_ERROR);
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
    // Assertions
    assert!(
        VALID_BUILD_FLAVORS.contains(&BUILD_FLAVOR),
        "Invalid build flavor: {BUILD_FLAVOR:?}. This is a build configuration error, set the correct THREEMA_BUILD_FLAVOR env var when building!"
    );

    // Print header
    if BUILD_FLAVOR.starts_with("work-") {
        print!("\x1b[34m");
    } else {
        print!("\x1b[32m");
    }
    println!(" _____ _                         ");
    println!("|_   _| |_ ___ ___ ___ _____ ___ ");
    println!("  | | |   |  _| -_| -_|     | .'|");
    println!("  |_| |_|_|_| |___|___|_|_|_|__,|\x1b[0m");
    println!();
    println!("Desktop launcher v{VERSION} ({BUILD_FLAVOR})");

    // Get args
    let mut args: Vec<String> = env::args().collect();

    // Extract launcher binary path
    let launcher_path = args.remove(0);

    // Show help or version
    if args.is_empty() || args.iter().any(|arg| arg == "-h" || arg == "--help") {
        print_usage_and_exit(&launcher_path);
    }
    if args.iter().any(|arg| arg == "--version") {
        process::exit(0);
    }

    // Extract target binary path
    let target_path = PathBuf::from(args.remove(0));
    println!("Launching Threema Desktop through {target_path:?}");

    // Ensure that target path exists
    if !target_path.exists() {
        print_error!("Error: Target path {target_path:?} not found");
        process::exit(EXIT_CODE_LAUNCHER_ERROR);
    }
    if !target_path.is_file() {
        print_error!("Error: Target path {target_path:?} is not a file");
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
                print_error!("Failed to launch target binary: {e}");
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
                println!("\x1b[33mRemoving profile directory at {profile_directory:?}!\x1b[0m");
                if let Err(e) = fs::remove_dir_all(&profile_directory) {
                    print_error!("Failed to remove profile directory: {e:#}");
                    process::exit(EXIT_CODE_LAUNCHER_ERROR);
                }
                println!("Restarting");
                continue;
            }
            Some(other) => process::exit(other),
            None => process::exit(EXIT_CODE_LAUNCHER_ERROR),
        }
    }
}
