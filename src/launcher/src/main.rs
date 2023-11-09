use std::{
    env,
    path::{Path, PathBuf},
    process::{self, Command, Output, Stdio},
};

use home::home_dir;

// Compile-time constants
const VERSION: &str = env!("CARGO_PKG_VERSION");
const BUILD_VARIANT: &str = env!("THREEMA_BUILD_VARIANT"); // consumer or work
const BUILD_ENVIRONMENT: &str = env!("THREEMA_BUILD_ENVIRONMENT"); // sandbox or live

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
    process::exit(1);
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

    profile_directory_location.join(format!("{BUILD_VARIANT}-{BUILD_ENVIRONMENT}-{profile}"))
}

fn main() {
    let mut args: Vec<String> = env::args().collect();

    // Extract launcher binary path
    let launcher_path = args.remove(0);

    // Show help or version
    if args.is_empty() || args.iter().any(|arg| arg == "-h" || arg == "--help") {
        print_usage_and_exit(&launcher_path);
    }
    if args.iter().any(|arg| arg == "--version") {
        println!("Desktop launcher v{VERSION}");
        process::exit(0);
    }

    // Extract target binary path
    let target_path = PathBuf::from(args.remove(0));

    if BUILD_VARIANT == "work" {
        print!("\x1b[34m");
    } else {
        print!("\x1b[32m");
    }
    println!(" _____ _                         ");
    println!("|_   _| |_ ___ ___ ___ _____ ___ ");
    println!("  | | |   |  _| -_| -_|     | .'|");
    println!("  |_| |_|_|_| |___|___|_|_|_|__,|\x1b[0m");
    println!();
    println!("Desktop launcher v{VERSION}");
    println!("Launching Threema Desktop at {target_path:?}");

    // Ensure that target path exists
    if !target_path.exists() {
        print_error!("Error: Target path {target_path:?} not found");
        process::exit(1);
    }
    if !target_path.is_file() {
        print_error!("Error: Target path {target_path:?} is not a file");
        process::exit(1);
    }

    // Determine profile directory
    let profile_directory = determine_profile_directory(args.as_slice());
    println!("Profile directory: {profile_directory:?}");

    // Launch child process and wait for completion
    let now = time::OffsetDateTime::now_utc();
    println!("Current timestamp (UTC): {now}");
    println!("------");
    match Command::new(target_path)
        .args(args)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
    {
        Ok(Output { status, .. }) => {
            println!("Target binary exited with status {status}");
        }
        Err(e) => {
            print_error!("Failed to launch target binary: {e}");
        }
    }
}
