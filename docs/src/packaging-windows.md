# Packaging: Windows

For distribution on Windows, we generate MSIX packages.

More information:

- [Understanding how packaged desktop apps run on Windows](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes)
- [The package manifest](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion)

## App Execution Alias

We set an app execution alias that allows us to launch the packaged application from the command
line, as if the EXE was on the user's $PATH.
