import {type u53} from '~/common/types';

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
     * Delete the user profile and restart the application.
     *
     * Restarting is done using `app.exit(0)`, which means that the application will be
     * force-closed immediately.
     */
    readonly deleteProfileAndRestartApp: () => void;

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
}
