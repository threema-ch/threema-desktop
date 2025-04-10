// Compile-time constants
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

// Exit codes
pub const EXIT_CODE_EXIT: i32 = 0;
pub const EXIT_CODE_RESTART: i32 = 8;
pub const EXIT_CODE_DELETE_PROFILE_AND_RESTART: i32 = 9;
pub const EXIT_CODE_RENAME_PROFILE_AND_RESTART: i32 = 10;
pub const EXIT_CODE_RESTART_AND_INSTALL_UPDATE: i32 = 11;
pub const EXIT_CODE_LAUNCHER_ERROR: i32 = 20;

// Delays
pub const DELAY_BEFORE_ERROR_EXIT_MS: u64 = 2000;
