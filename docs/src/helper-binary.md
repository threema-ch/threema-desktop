# Helper Binary

The helper binary, or `ThreemaDesktopHelper`, is a helper application for Threema Desktop on macOS.

## Why we need it

On macOS, applications are generally prevented from elevating privileges to do certain privileged
actions – for good reason. However, elevated privileges are needed to write the updated app bundle
to the `/Applications` directory when the application wants to update itself (auto-update). macOS
requires applications to register an additional helper which performs said privileged operations,
while the main application keeps the restricted original privileges.

For this reason, the smallest possible part of the auto-update logic (i.e., the copy operation from
the downloaded app package into `/Applications`) was moved to such a helper application (also called
[Launch Daemon](https://developer.apple.com/library/archive/technotes/tn2083/_index.html#//apple_ref/doc/uid/DTS10003794-CH1-SUBSECTION2)).

> **Note:** The daemon is launched on demand, and only runs when called by the
> `ThreemaDesktopLauncher` to perform a copy operation when an auto-update is requested.

> ⚠️ **Note:** The Objective-C bindings are generally marked `unsafe`. Safety considerations are
> documented directly in the code, where applicable. `NSError` and `CFError` objects are usually not
> cleaned up, because if the helper deviates from the happy path, it will ultimately exit.

## Security considerations

To ensure that the helper is secure, the following measures are in place:

- The `SMAuthorizedClients` key in the helper's `Info.plist` ensures that macOS will refuse
  installing it (or changing it in any way) if the action was not performed by the
  `ThreemaDesktopLauncher`, which is ensured by signature validation on both ends.
- Whenever a client connects to the helper's socket, the helper validates the signature of the
  client, and only proceeds if the client application was signed by the "Developer ID Application"
  certificate of Threema GmbH.
- Before replacing the existing `.app` package in `/Applications` with the downloaded `.app`
  package, the new package's signature is validated.

In summary: The helper application only contains the necessary code to perform the various signature
validations, as well as the code to perform the copy operation.

## What it does

When a user requests an auto-update for the first time, the helper application is registered in the
system, which requires interactive approval by the user. If the user grants the authorization to
install the helper, Threema Desktop is able to install the update. The entire process is as follows:

### 1. Main Electron Application

1. Application checks whether an update is available, and offers the user to auto-update.
2. If the user chooses to auto-update, the update is downloaded to a temporary location.
3. The main Electron application quits itself, so that `ThreemaDesktopLauncher` is able to continue
   the update process.

### 2. `ThreemaDesktopLauncher`

1. If the helper is not yet installed, requests authorization to install ("bless") it (which will
   show an interactive prompt to the user).
2. Using the obtained authorization, registers the helper using `SMJobBless`. Note: This will also
   register a Unix Socket that is used to launch the helper on-demand whenever the launcher connects
   to it (which is a built-in feature of `launchd`).
3. Authorization resources are freed, because they are no longer needed after the helper has been
   blessed.
4. Connects to the socket, and sends a message to the helper to perform the copy.
5. Awaits the reply from the helper application via socket.
6. If the helper's response was positive, the launcher sends another request to the helper to
   perform a (full) relaunch. After the request has been sent, the launcher quits itself.

### 3. `ThreemaDesktopHelper`

1. Validates the signature of the source `.app` package to ensure it's signed by Threema. If not,
   the process is aborted with an error.
2. Copies the new `.app` package from the downloaded `.dmg` to a temporary location (needed because
   `.dmg` is a read-only volume).
3. Preserves ownership of the original app package, so the app is owned by the same user and group
   after the update.
4. Removes the `com.apple.quarantine` attribute from the new `.app` package (which was added because
   it's a downloaded file).
5. If all previous steps were successful, performs an atomic replacement of the old `.app` package
   with the new.
6. If the replacement was successful, replies to the launcher with a success message, or an error
   otherwise.
7. Performs an application restart when requested by the launcher, after the launcher process has
   exited.

## Development

> ⚠️ **Note:** Registering a helper application is only possible if the main app, as well as the
> helper, are both signed. This means the helper application can only be tested in a signed
> production build.

Relevant paths during development:

- Logs of the helper application are written to: `/var/log/ch.threema.threema-desktop-helper.log`.
- The `launchd.plist` is copied to `/Library/LaunchDaemons/ch.threema.threema-desktop-helper.plist`
  by the OS as soon as the helper is registered using `SMJobBless`.
- The helper binary itself is copied to
  `/Library/PrivilegedHelperTools/ch.threema.threema-desktop-helper` by the OS as soon as the helper
  is registered using `SMJobBless`.

> ⚠️ **Note:** Remember to remove the helper's `.plist` from `/Library/LaunchDaemons` and its binary
> from `/Library/PrivilegedHelperTools` if needed during testing, because it won't be registered
> again if its version number doesn't change.
