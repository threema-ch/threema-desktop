use common::util::constants::determine_app_rdn;
use const_format::formatcp;

// Apple Team ID which this app is signed by. Important: Must be provided using the `APPLE_TEAM_ID`
// environment variable at compile time, else defaults to a senseless string.
pub const APPLE_TEAM_ID: &str = match option_env!("APPLE_TEAM_ID") {
    Some(value) => value,
    None => "ABCDEFGHIJ",
};

/// `SMAuthorizedClients` requirements string, which includes the code signing requirements needed
/// by clients to be allowed to connect to this helper application.
///
/// Note:
/// - Identifier of the connecting application needs to have the correct RDN (e.g.
///   `ch.threema.threema-desktop`).
/// - The connecting application must be signed with a certificate issued by Apple, and:
///     - Must be of type "Developer ID Application" (`leaf[field.1.2.840.113635.100.6.1.13]`).
///     - The Organization Unit (OU) must be Threema's Team ID.
pub const SM_AUTHORIZED_CLIENTS: &str = formatcp!(
    r#"identifier "{}" and anchor apple generic and certificate leaf[subject.OU] = {} and certificate leaf[field.1.2.840.113635.100.6.1.13] /* exists */"#,
    determine_app_rdn(),
    APPLE_TEAM_ID
);

/// macOS `Info.plist` to embed into the binary.
///
/// Important: Keep `SMAuthorizedClients` complementary to the `SMPrivilegedExecutables` value
/// defined in the launcher's `Info.plist` (in `dist-electron.cjs`).
pub const INFO_PLIST: &[u8] = formatcp!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
            <dict>
                <key>CFBundleIdentifier</key>
                <string>{0}-helper</string>
                <key>CFBundleInfoDictionaryVersion</key>
                <string>6.0</string>
                <key>CFBundleName</key>
                <string>Threema Update Helper</string>
                <key>CFBundleVersion</key>
                <string>1.0.0</string>
                <key>SMAuthorizedClients</key>
                <array>
                    <string>{1}</string>
                </array>
            </dict>
        </plist>"#,
        determine_app_rdn(),
        SM_AUTHORIZED_CLIENTS
    ).as_bytes();

/// macOS `launchd.plist` to embed into the binary.
pub const LAUNCHD_PLIST: &[u8] = formatcp!(
    r#"<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
        <dict>
            <key>Label</key>
            <string>{0}-helper</string>

            <key>Program</key>
            <string>/Library/PrivilegedHelperTools/{0}-helper</string>

            <key>StandardOutPath</key>
            <string>/var/log/{0}-helper.log</string>

            <key>StandardErrorPath</key>
            <string>/var/log/{0}-helper.log</string>

            <key>Sockets</key>
            <dict>
                <key>Primary</key>
                <dict>
                    <key>SockPathName</key>
                    <string>/var/run/{0}-helper.sock</string>
                </dict>
            </dict>

            <key>AssociatedBundleIdentifiers</key>
            <array>
                <string>{0}</string>
            </array>
        </dict>
    </plist>"#,
    determine_app_rdn(),
).as_bytes();
