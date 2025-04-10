pub const BUILD_FLAVOR: &str = env!("THREEMA_BUILD_FLAVOR"); // e.g. consumer-sandbox or work-live

pub const VALID_BUILD_FLAVORS: [&str; 5] = [
    "consumer-sandbox",
    "consumer-live",
    "work-sandbox",
    "work-live",
    "work-onprem",
];

// Note: Keep this in sync with `determineAppName` in `base.js`.
pub const fn determine_app_name() -> &'static str {
    // Compare as bytes to use `match` in `const fn`. See:
    // https://github.com/rust-lang/rust/issues/90237#issuecomment-1550885913.
    match BUILD_FLAVOR.as_bytes() {
        b"consumer-live" => "Threema Beta",
        b"consumer-sandbox" => "Threema Green Beta",
        b"work-live" => "Threema Work Beta",
        b"work-sandbox" => "Threema Blue Beta",
        b"work-onprem" => "Threema OnPrem Beta",
        _other => {
            panic!("Invalid build flavor provided. This is a build configuration error, set the correct THREEMA_BUILD_FLAVOR env var when building!");
        }
    }
}

// Note: Keep this in sync with `determineAppRdn` in `base.js`.
pub const fn determine_app_rdn() -> &'static str {
    // Compare as bytes to use `match` in `const fn`. See:
    // https://github.com/rust-lang/rust/issues/90237#issuecomment-1550885913.
    match BUILD_FLAVOR.as_bytes() {
        b"consumer-live" => "ch.threema.threema-desktop",
        b"consumer-sandbox" => "ch.threema.threema-green-desktop",
        b"work-live" => "ch.threema.threema-work-desktop",
        b"work-sandbox" => "ch.threema.threema-blue-desktop",
        b"work-onprem" => "ch.threema.threema-onprem-desktop",
        _other => {
            panic!("Invalid build flavor provided. This is a build configuration error, set the correct THREEMA_BUILD_FLAVOR env var when building!");
        }
    }
}
