import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {u53} from '@threema/ts-utils/integer/u53';

import type {LogInfo} from '~/common/node/file-storage/log-info';
import type {RemoteSecretErrorType} from '~/common/remote-secret';
import type {DomainCertificatePin} from '~/common/types';

export interface ErrorDetails {
    readonly message: string;
    readonly location?: {
        readonly filename: string;
        readonly line: u53;
    };
    readonly stacktrace?: string;
}

export interface SystemInfo {
    readonly os: 'linux' | 'macos' | 'windows' | 'other';
    readonly arch: string;
    readonly locale: string;
    readonly isSafeStorageAvailable: boolean;
}

export interface DeleteProfileOptions {
    /**
     * Whether to create a backup of the old profile by renaming it instead of deleting it.
     *
     * If a backup is created, then it can be restored when re-linking a new profile.
     */
    readonly createBackup: boolean;
}

export interface ScreenSharingSource {
    readonly id: string;
    readonly name: string;
    readonly appIcon: string | undefined;
    readonly thumbnail: string;
    readonly isScreen: boolean;
}

/**
 * An IPC interface to call Electron functions from the application.
 */
export interface ElectronIpc {
    /**
     * Report an error to the main process.
     */
    readonly reportError: (error: ErrorDetails) => void;

    /**
     * Get the app path.
     */
    readonly getAppPath: () => string;

    /**
     * Get system info.
     */
    readonly getSystemInfo: () => Promise<SystemInfo>;

    /**
     * Log to file.
     */
    readonly logToFile: (
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        data: string,
    ) => Promise<void>;

    /**
     * Get gzip-compressed contents of the log files.
     */
    readonly getGzippedLogFiles: () => Promise<{
        app?: ReadonlyUint8Array;
        bw?: ReadonlyUint8Array;
    }>;

    /**
     * Return whether or not file logging is enabled.
     *
     * If `undefined` is returned, this means that the file logger could not be instantiated.
     */
    readonly isFileLoggingEnabled: () => Promise<boolean | undefined>;

    /**
     * Return logging information, e.g. log file paths and sizes.
     */
    readonly getLogInformation: () => Promise<LogInfo>;

    /**
     * Enable or disable file logging and restart.
     */
    readonly setFileLoggingEnabledAndRestart: (enabled: boolean) => void;

    /**
     * Clear the log files (but do not restart).
     */
    readonly clearLogFiles: () => Promise<void>;

    /**
     * Restart the application.
     *
     * Restarting is done using `app.exit(...)`, which means that the application will be
     * force-closed immediately.
     */
    readonly restartApp: () => void;

    /**
     * Restart the application and install an app update.
     *
     * Restarting is done using `app.exit(...)`, which means that the application will be
     * force-closed immediately.
     */
    readonly restartAppAndInstallUpdate: () => void;

    /*
     * Return whether or not the spellcheck is enabled. Returns undefined if the spellchecker is not
     * implemented.
     */
    readonly isSpellcheckEnabled: () => Promise<boolean | undefined>;

    /**
     * Enable or disable the spellcheck (currently only acts on MacOS). TODO(DESK-1458) Implement
     * spellcheck for non darwin systems.
     */
    readonly setSpelleckEnabledAndRestart: (enabled: boolean) => void;

    /**
     * Delete the user profile and restart the application.
     *
     * Restarting is done using `app.exit(...)`, which means that the application will be
     * force-closed immediately.
     */
    readonly deleteProfileAndRestartApp: (options: DeleteProfileOptions) => void;

    /**
     * Close the application.
     */
    readonly closeApp: () => void;

    /**
     * Delete all old profiles that are found at the root of the app path.
     */
    readonly removeOldProfiles: () => void;

    /**
     * Find all old profiles at the root of the app path, and return the newest one.
     */
    readonly getLatestProfilePath: () => string | undefined;

    /**
     * Update the public key pins after the start of the app,
     * e.g. after loading the pins from the .oppf file.
     */
    readonly updatePublicKeyPins: (publicKeyPins: DomainCertificatePin[]) => Promise<boolean>;

    /**
     * Update app badge with the total unread messages count.
     *
     * Currently this only affects macOS and some Linux versoins and it is ignored on other
     * platforms. There is no need to add a setting for toggle this functionality since it can be
     * managed at OS level on macOS on a per app basis.
     *
     * @param totalUnreadMessageCount The number of unread messages. If this value is 0, the badge
     *   is not shown (i.e. it is removed if it was previously shown). If the value is 100 or more,
     *   '99+' is displayed automatically by the OS on macOS.
     */
    readonly updateAppBadge: (totalUnreadMessageCount: u53) => void;

    /**
     * Get the test data.
     */
    readonly getTestData: () => Promise<string | undefined>;

    /**
     * Load user's password from encrypted storage.
     */
    readonly loadUserPassword: () => Promise<string | undefined>;

    /**
     * Store user's password into encrypted storage.
     */
    readonly storeUserPassword: (password: string) => Promise<boolean>;

    /**
     * Restart the app with the given {@link RemoteSecretErrorType} as the reason.
     */
    readonly remoteSecretErrorRestartApp: (errorType: RemoteSecretErrorType) => void;

    /**
     * Restart the app because Remote Secret is activated and the system is on the verge of being
     * suspended.
     */
    readonly remoteSecretSystemSuspensionRestartApp: () => void;

    /**
     * Return the {@link RemoteSecretErrorType} the app was launched with, if any.
     */
    readonly getRemoteSecretLaunchParameter: () => RemoteSecretErrorType | undefined;

    /**
     * Return true if the app was restarted due to a system suspension when remote secret is
     * activated.
     */
    readonly getRemoteSecretSystemSuspensionRestartParameter: () => boolean;

    /**
     * Display a reminder on the desktop indicating that the user’s screen is being shared.
     */
    readonly showScreenSharingReminder: (text: string, label: string) => void;

    /**
     * Close the desktop reminder indicating that the user’s screen is being shared.
     */
    readonly closeScreenSharingReminder: () => void;

    /**
     * Screen sharing source selected via custom picker.
     */
    readonly screenSharingSourceSelected: (sourceId: string | undefined) => void;

    /*
     * Registers a callback to run when the `electron-main` thread requests to open the
     * screen sharing picker.
     */
    readonly registerOnPresentScreenSharingPickerCallback: (
        callback: (sources: ScreenSharingSource[]) => void,
    ) => void;

    /*
     * Registers a callback to run when the `electron-main` thread requests to stop screen sharing.
     */
    readonly registerOnScreenSharingStopCallback: (callback: () => void) => void;

    /**
     * Register a callback for `on-suspend` and `on-lock` events.
     */
    readonly registerOnSuspendCallback: (callback: () => Promise<void>) => void;

    /**
     * Check if the OPPF is available in an isolated session.
     */
    readonly checkOppFile: (
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ) => Promise<u53>;

    /**
     * Fetch the OPPF in an isolated session.
     */
    readonly getOppFile: (
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ) => Promise<ArrayBuffer>;

    /**
     * Execute a callback that can be awaited before doing an app restart.
     */
    readonly beforeRestart: () => Promise<void>;

    /**
     * Signal that the app has completed pre-restart tasks (e.g., updating certificate pins)
     * and is ready to restart.
     */
    readonly signalRestartReady: () => Promise<void>;

    /**
     * Handle a mismatch between stored pins and the provided certificate
     */
    readonly registerInvalidCertificatePins: (callback: () => Promise<void>) => void;

    /**
     * Directly trigger the INVALID_CERTIFICATE_PINS flow without needing a real TLS request.
     * Only available in non-production builds.
     */
    readonly triggerInvalidCertificatePins: () => Promise<void>;

    /**
     * Check if the OPPF is available in an isolated session.
     */
    readonly checkFallbackOppFile: (oppfUrl: string, userAgent: string) => Promise<u53>;

    /**
     * Fetch the OPPF in an isolated session.
     */
    readonly getFallbackOppFile: (oppfUrl: string, userAgent: string) => Promise<ArrayBuffer>;

    /**
     * Open (or focus, if already open) the WebRTC internals window.
     */
    readonly openWebRtcInternals: () => void;
}

export interface ScreenSharingReminderDetails {
    readonly text: string;
    readonly label: string;
}

/**
 * An IPC interface to call Electron functions from the scfreen sharing reminder.
 */
export interface ScreenSharingReminderIpc {
    /**
     * Hide the desktop reminder indicating that the user’s screen is being shared.
     */
    readonly hideScreenSharingReminder: () => void;

    /**
     * Stop screen sharing.
     */
    readonly stopScreenSharing: () => void;

    /**
     * Send some details like labes, texts etc. used by the screen shaing reminder.
     */
    readonly onDetails: (callback: (details: ScreenSharingReminderDetails) => void) => void;
}
