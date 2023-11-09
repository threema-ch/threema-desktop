# Profile Directory

## Location

The profile directory location depends on the operating system:

- Linux / BSD: `$XDG_DATA_HOME/ThreemaDesktop/` or `~/.local/share/ThreemaDesktop/`
- macOS: `~/Library/Application Support/ThreemaDesktop/`
- Windows: `%APPDATA%\ThreemaDesktop\`
- Other: `~/.ThreemaDesktop/`

## Profile Directory

The name of the profile directory is `${buildVariant}-${buildEnvironment}-${profileName}`. If no
profile name is explicitly specified, it defaults to `default`.

Examples:

- `consumer-live-default` (default profile of consumer app)
- `work-sandbox-tmp` (profile "tmp" of internal Threema Work testing app)
