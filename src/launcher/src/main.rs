use std::{
    env,
    path::PathBuf,
    process::{self, Command, Output, Stdio},
};

const VERSION: &str = env!("CARGO_PKG_VERSION");

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
        "Usage: {} <path-to-threema-desktop> [args...]",
        launcher_path
    );
    process::exit(1);
}

fn main() {
    let mut args: Vec<String> = env::args().collect();

    // Extract launcher binary path
    let launcher_path = args.remove(0);

    // Extract target binary path
    if args.is_empty() {
        print_usage_and_exit(&launcher_path);
    }
    let target_path = PathBuf::from(args.remove(0));

    println!(" _____ _                         ");
    println!("|_   _| |_ ___ ___ ___ _____ ___ ");
    println!("  | | |   |  _| -_| -_|     | .'|");
    println!("  |_| |_|_|_| |___|___|_|_|_|__,|");
    println!();
    println!("Desktop launcher v{}", VERSION);
    println!("Launching Threema Desktop at {:?}\n", target_path);

    // Ensure that target path exists
    if !target_path.exists() {
        print_error!("Error: Target path {:?} not found", target_path);
        process::exit(1);
    }
    if !target_path.is_file() {
        print_error!("Error: Target path {:?} is not a file", target_path);
        process::exit(1);
    }

    // Launch child process and wait for completion
    match Command::new(target_path)
        .args(args)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .output()
    {
        Ok(Output { status, .. }) => {
            println!("Target binary exited with status {}", status);
        }
        Err(e) => {
            print_error!("Failed to launch target binary: {}", e);
        }
    }
}
