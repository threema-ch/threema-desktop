// Compile-time constants
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const BUILD_FLAVOR: &str = env!("THREEMA_BUILD_FLAVOR"); // e.g. consumer-sandbox or work-live

// Valid build flavors
pub const VALID_BUILD_FLAVORS: [&str; 5] = [
    "consumer-sandbox",
    "consumer-live",
    "work-sandbox",
    "work-live",
    "work-onprem",
];

// Note: Keep this in sync with determineAppName in base.js.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn determine_app_name() -> &'static str {
    match BUILD_FLAVOR {
        "consumer-sandbox" => "Threema Green Beta",
        "consumer-live" => "Threema Beta",
        "work-sandbox" => "Threema Blue Beta",
        "work-live" => "Threema Work Beta",
        "work-onprem" => "Threema OnPrem Beta",
        _other => {
            panic!("Invalid build flavor: {BUILD_FLAVOR:?}. This is a build configuration error, set the correct THREEMA_BUILD_FLAVOR env var when building!");
        }
    }
}

// Exit codes
pub const EXIT_CODE_EXIT: i32 = 0;
pub const EXIT_CODE_RESTART: i32 = 8;
pub const EXIT_CODE_DELETE_PROFILE_AND_RESTART: i32 = 9;
pub const EXIT_CODE_RENAME_PROFILE_AND_RESTART: i32 = 10;
pub const EXIT_CODE_RESTART_AND_INSTALL_UPDATE: i32 = 11;
pub const EXIT_CODE_LAUNCHER_ERROR: i32 = 20;

// Delays
pub const DELAY_BEFORE_ERROR_EXIT_MS: u64 = 2000;
