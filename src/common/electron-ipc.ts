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
}
