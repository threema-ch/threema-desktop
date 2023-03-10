# Electron

Here are some hints on how to debug issues with Electron issues:

## Verbose Logging

To run the application with verbose logging, start it like this

    $ npm run dev:consumer-sandbox -- --enable-logging --v=2

## Debugging Crashes

When Electron crashes, there will be a crash dump in the "minidump" format in the user profile,
inside the `Crashpad/completed/` directory. These can be symbolicated with
[`minidump-stackwalk`](https://crates.io/crates/minidump-stackwalk).

First, install `minidump-stackwalk`:

    $ cargo install minidump-stackwalk

Download debug symbols for the used Electron version from
<https://github.com/electron/electron/releases> (e.g.
`electron-v22.0.0-linux-x64-symbols.zip ` or
`electron-v22.0.0-darwin-arm64-symbols.zip`) and unzip the file.

Then you can analyze the crash dump:

    $ minidump-stackwalk <dump-file>.dmp \
        --symbols-path /path/to/debugsymbols/breakpad_symbols/
