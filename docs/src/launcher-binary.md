# Launcher Binary

## Why we need it

There are certain limitations when starting the Electron application binary directly:

- The application cannot restart itself.
- The electron process opens various files in the profile directory. On certain file systems
  (_cough_ Windows), this locks the files, which means that the profile directory cannot be deleted
  from within the application when re-linking.

## What it does

To solve this issues, we put a separate binary in front of the Electron application: The _Launcher
Binary_. It is written in Rust, which allows for robust code and easy cross-compilation. The source
code can be found in the `src/launcher/` directory.

The application communicates with the launcher binary through the exit code. For example, the exit
code 0 means "close application" while the exit code 8 means "restart application".

## Development

> ⚠️ **Warning:** When running the dev build through `npm run dev:<flavor>`, restarting the
> application or re-linking will not work.

To test functionality handled by the launcher binary during development, one must build and run a
dist build (for example `npm run dist:consumer-sandbox`). To start the build through the launcher,
run the following generated binary:

- Linux: `build/electron/packaged/Threema Green Beta-linux-x64/ThreemaDesktopLauncher`
- macOS: `build/electron/packaged/Threema Green Beta-darwin-arm64/Threema Green Beta.app`
