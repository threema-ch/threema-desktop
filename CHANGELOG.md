# Threema Desktop Changelog

This changelog lists the most important changes for each released version. For
the full log, please refer to the git commit history.

### v2.0.0-preview2 (2022-12-21)

New features:

- Show line above unread messages (WEBMD-866)
- Handle incoming location messages (WEBMD-890)
- Dynamically switch between light and dark theme on macOS (WEBMD-802)
- Display unread badge in macOS app icon (WEBMD-867)
- Option to enter custom Threema Safe server credentials (authentication) when linking (WEBMD-885)

Improvements:

- When opening chat, always mark all messages as read (WEBMD-474)
- Use Apple emoji on macOS (WEBMD-865)
- Reject PFS messages (WEBMD-878)

Bugfixes:

- Nickname is no longer disclosed immediately to unknown contacts (WEBMD-374)
- Properly reflect group profile pictures towards iOS app (WEBMD-871)
- When more than one system dialog is opened, page no longer remains white (WEBMD-884)

### v2.0.0-preview1 (2022-12-06)

First public preview release!

Bugfixes:

- Fix handling of private conversations (WEBMD-874)

### v2.0.0-preview0 (2022-12-01)

Release candidate for the first public preview release!

Bugfixes:

- Fix logging in non-sandbox builds (WEBMD-853)
- Update Electron to fix CVE-2022-4135 (WEBMD-857)
- Fix for "Assertion failed, message: Expected local model store key to be unique" (WEBMD-819)
- Fix application icon under Linux (WEBMD-841)

Protocol:

- Protocol violations in tasks are now shown to the user (WEBMD-645)

Packaging:

- Signing for macOS DMG (WEMBD-343)
- Signing for Windows EXE (WEBMD-760)
- Public signed repository for Linux Flatpak (WEBMD-746)

### v0.11.0 (2022-11-25)

This is the feature-freeze release! From now on until the first public preview
release, we will concentrate on stability and polishing.

UI:

- Early version of quotes v2 support (WEBMD-460)
- More user-friendly placeholder texts for unsupported message types (WEBMD-750)
- When chat is empty, explain that there's no chat history (WEBMD-764)
- Show contact names / nicknames instead of IDs in group header (WEBMD-797)
- Improved error message when trying to add a contact while offline (WEBMD-835)
- Allow deselecting a contact/group in contact/group list (WEBMD-789)

Bugfixes:

- Handle errors when fetching private data during linking (WEBMD-825)
- Message timestamp in conversation list is now correct (WEBMD-805)
- Fix displaying and expansion of group members (WEBMD-794)
- Fix color / contrast of links in dark mode (WEBMD-795)
- Fixes and workarounds for contact deletion (WEBMD-811, WEBMD-786)
- Render @[@@@@@@@@] mention as @All (WEBMD-824)
- Fix inconsistent avatar initials (WEBMD-806)

Protocol:

- Force relinking if dropped by mediator or other device (WEBMD-742, WEBMD-733)

Diagnostics:

- Log to file (WEBMD-655)

Packaging:

- Linux Flatpak: Run on Wayland if available (WEBMD-631)
- Fix window decorations under Wayland (WEBMD-840)

### v0.10.0 (2022-11-18)

We're getting closer to the initial release. In this version, we've focussed on polishing and
bugfixing, and did some preparations for packaging the release builds (e.g. differentiating between
sandbox and live builds).

> :warning: With this release, current users need to migrate from "Threema for Desktop" to "Threema
> Red for Desktop"! The Desktop team will provide you with information on how to upgrade.

UI:

- Consistent application menu across all platforms (WEBMD-648)
- Remove most UI placeholders for not-yet-implemented features for the public preview (WEBMD-761)
- After adding a contact, open the chat with that contact to immediately start writing (WEBMD-765)
- Text improvements (WEBMD-669)

Linking:

- Restore all conversations (still without messages) when linking an iOS device, not just
  groups (WEBMD-785)

Bugfixes:

- Fix "Proxy has been released and is not useable" error (WEBMD-718)
- Fix exception when deleting contact or message (WEBMD-741)
- Latest message timestamp in conversation list sometimes not updated (WEBMD-805)
- When sending a direct message to contact from a group for the first time, it is now displayed
  on the contact list as an individual contact (WEBMD-651)
- Do not allow adding a contact without Mediator connection (WEBMD-757)
- Fix button size in small layout (WEBMD-584)
- Allow closing own profile view in small layout (WEBMD-755)

Protocol:

- Detect when being kicked from device group (WEBMD-742)
- Set appropriate client information, visible in the device list (WEBMD-774)
- Implement D2M version negotiation (WEBMD-202)

Packaging:

- Separate Threema / Threema Red builds (WEBMD-681)
- Ensure that release builds don't log SQL (WEBMD-823)
- Rename to "Threema Tech Preview"

### v0.9.0 (2022-11-02)

> :warning: The path of the profile directory has changed! If you're upgrading to v0.9.0:
>
> - If you have an iOS device:
>   - Before upgrading from 0.8 to 0.9, unlink Desktop first:
>     - Triple-click on your own avatar (top left)
>     - In the debug bar that just opened, select the "Storage" tab
>     - Click **Delete Data and Unlink**
>   - Now install and start version 0.9, and follow the instructions to re-link
> - If you don't have an iOS device, you have to rename a directory:
>   - Linux (Flatpak): In `~/.var/app/ch.threema.threema-desktop/data/` rename
>     `threema-desktop` to `ThreemaDesktop`
>   - macOS (DMG): In `/Users/$USERNAME/Library/Application Support/` rename
>     `threema-desktop` to `ThreemaDesktop`
>   - Windows (EXE): In `C:\Users\%USERNAME%\AppData\Roaming\` rename
>     `threema-desktop` to `ThreemaDesktop`

> :warning: **Known Issue:** There is currently an error message shown when deleting a contact or
> message. Workaround: Reload the application and continue using Threema Desktop. The deleted
> contact or message will be gone.

> :warning: **Known Issue:** The "proxy has been released" error is still here, it should get fixed
> with the next release.

UI:

- Cross-platform ID colors (WEBMD-529)

Bugfixes:

- Fix bug where new messages don't appear in chat (WEBMD-724)
- Handle unknown CSP payload types without disconnecting (WEBMD-769)
- Edited contact does not immediately refresh in contact list (WEBMD-756)
- Prevent deleting contacts that are still member of a group (WEBMD-437)
- Avatar "circles" in chats are sometimes missing / shown unexpectedly (WEBMD-723)
- Conversation not highlighted after writing first message (WEBMD-672)
- Edited contact does not immediately refresh in contact list (WEBMD-756)

Protocol:

- Reflect incoming CSP group ack messages (WEBMD-734)

Packaging:

- Create Windows releases (WEBMD-291)
- Automatically check for updates (WEBMD-732)

### v0.8.0 (2022-10-19)

> :warning: **Known Issue:** Messages sometimes don't appear in the chat view.
> In this case, close and re-open the chat view. We hope to fix this bug in the
> next version.

UI:

- Render text markup in messages (WEBMD-245)
- Renter mentions in messages (WEBMD-147)
- Add advanced options into pairing process (WEBMD-699)
- Allow listing groups in contact list (WEBMD-602)
- User-provided password for app encryption (WEBMD-229)

Protocol:

- Implement handling of reflected dissolved groups (WEMBD-717)

Bugfixes:

- Fix message synchronization bug (WEBMD-708)
- Context menu position fix (WEBMD-582)
- Update contact display name and initials on contact update (WEBMD-698)
- Message draft bugfixes (WEBMD-710)

Internal:

- Migrate contact list to use view models (WEBMD-700)
- Add migrations for key storage (WEBMD-554)
- Initial preparations for Windows builds (WEBMD-291)

### v0.7.0 (2022-10-05)

The focus of this release is the new linking/pairing process. Additionally,
this release adds support for message drafts and allows viewing your own
profile. Plus, of course, many other improvements and bugfixes!

UI:

- New linking/pairing process (WEBMD-665)
- Initial support for message drafts (WEBMD-667)
- Initial support to view own profile (WEBMD-164)
- Autofocus compose area on conversation switch (WEBMD-563)
- Allow unlinking device from debug panel (WEBMD-636)
- Case insensitive and locale aware contact sorting (WEBMD-480)

Protocol:

- Fix processing of group sync requests (WEBMD-664)

Bugfixes:

- Message updates and reactions are now shown immediately (WEBMD-331)
- When a critical error is shown to the user, the application does not lock up
  anymore and the "restart" button works (WEBMD-534)

### v0.6.0 (2022-09-23)

This release contains an important refactoring that will enable us to fix some
long-standing bugs (e.g. the "proxy has been released" crash) and facilitate
the implementation of certain planned UI features. Additionally, there are many
useful UI improvements as well!

UI:

- Keep top scroll position when a conversation moves up (WEBMD-606)
- Scroll to top when sending a message (WEBMD-606)
- Implement forwarding of text messages (WEBMD-519)
- Do not display contents of private chats (WEBMD-625)
- Show date for message timestamps that aren't today (WEBMD-617)
- Show leader state and device IDs in backend debug panel (WEBMD-661)

Protocol:

- Implement support for group sync requests (WEBMD-513)
  - Known bug: There is an incompatibility of the message format with Android /
    iOS which will be fixed in the next release (WEBMD-664)

Bugfixes:

- Persist sent/delivered status after app restart (WEBMD-622)

### v0.5.1 (2022-09-14)

- Fix connection error for identities with server group <16 (WEMBD-656)

### v0.5.0 (2022-09-13)

This (big) release is mostly about group support, but also includes a lot of
other new features and improvements.

Groups are now supported (and stay in sync between devices), but managing
groups (i.e. creating, editing, dissolving) is currently only possible from the
iOS device.

Protocol:

- Support for joining and syncing (but not managing) groups
- Process reflected delivery receipts, i.e. sync outgoing message states (WEBMD-455)
- Process known but unhandled messages, e.g. file or audio (WEBMD-520)

UI:

- Support for listing, viewing and using groups and listing their members
- Correctly sort conversation list (WEBMD-498)
- Add message details dialog (WEBMD-496)
- Conversation list: Implement filtering (WEBMD-601)
- Conversation list: Highlight active conversation (WEBMD-540)
- Contact list: Hide group-only contacts (WEBMD-570)
- Make URLs in messages clickable (WEBMD-621)
- Render emoji with Twemoji
- Handle ESC in form elements (WEBMD-521)
- Close aside on conversation close (WEBMD-600)
- Show version in macOS electron app (WEBMD-533)

Bugfixes:

- Fix message display with >100 messages in a conversation (WEBMD-567)
- Fix timestamp of incoming messages (WEBMD-547)

...and a huge amount of other improvements, refactorings and bugfixes in
preparation for future features.

### v0.4.0 (2022-07-13)

- Connection handling
  - Auto-connect on start (WEBMD-391)
  - Show connection status (WEBMD-392)
  - Automatic reconnect after disconnect (WEBMD-478)
- Message context menu (WEBMD-459)
  - Delete (WEBMD-462)
  - Copy (WEBMD-463)
  - Reactions (WEBMD-458)
- Basic desktop notifications (WEBMD-454)
- Contact list search (WEBMD-489)

...and various small bugfixes and improvements 😎

### v0.3.0 (2022-06-30)

- Unread messages count (WEBMD-424)
- Delivery Receipts (WEBMD-217, WEBMD-456)
- Support for IncomingMessageUpdate and OutgoignMessageUpdate (WEBMD-404)
- Temporarly restore DGK from safe (WEBMD-423)
- Load contacts and nickname from safe backup (WEBMD-352)
- Contact management (WEBMD-397, WEBMD-361, WEBMD-360, WEBMD-432, WEBMD-447)
- Show "not-allowed" cursor for UI elements that are not yet implemented (WEBMD-416)
- Add contact list tab switch (not yet functional, WEBMD-167)
- Several minor bugfixes

### v0.2.0 (2022-05-30)

First internal pre-alpha release:

- Packaging essentials: Linux Flatpak (WEBMD-288), macOS DMG (WEBMD-290),
  nightly releases (WEBMD-348)
- Basic reflection of contacts (IOS-2508, IOS-2463)
- Basic reflection of messages (WEBMD-227, WEBMD-297, WEBMD-227)
- Bootstrapping identity via backup (IOS-2544, WEBMD-350, WEBMD-351, WEBMD-352)
- Data persistence (WEBMD-354, WEBMD-224, WEBMD-338)
- List and add contacts (WEBMD-341, WEBMD-319)
- Backend foundations:
  - Leader vs non-leader logic (WEBMD-203)
  - Do not derive DGK from client key
  - Update timestamp logic (WEBMD-337)
