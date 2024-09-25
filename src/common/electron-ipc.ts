import type {LogInfo} from '~/common/node/file-storage/log-info';
import type {DomainCertificatePin, ReadonlyUint8Array, u53} from '~/common/types';

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
}

export interface DeleteProfileOptions {
    /**
     * Whether to create a backup of the old profile by renaming it instead of deleting it.
     *
     * If a backup is created, then it can be restored when re-linking a new profile.
     */
    readonly createBackup: boolean;
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
    readonly getGzippedLogFiles: () => Promise<{app: ReadonlyUint8Array; bw: ReadonlyUint8Array}>;

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
    readonly updatePublicKeyPins: (publicKeyPins: DomainCertificatePin[]) => void;

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
}
