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

// Exit codes
pub const EXIT_CODE_EXIT: i32 = 0;
pub const EXIT_CODE_RESTART: i32 = 8;
pub const EXIT_CODE_DELETE_PROFILE_AND_RESTART: i32 = 9;
pub const EXIT_CODE_RENAME_PROFILE_AND_RESTART: i32 = 10;
pub const EXIT_CODE_RESTART_AND_INSTALL_UPDATE: i32 = 11;
pub const EXIT_CODE_LAUNCHER_ERROR: i32 = 20;

// Delays
pub const DELAY_BEFORE_ERROR_EXIT_MS: u64 = 2000;
