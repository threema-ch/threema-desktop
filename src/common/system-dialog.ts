import type {ThreemaWorkCredentials} from '~/common/device';
import type {SystemInfo} from '~/common/electron-ipc';
import type {f64} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

// Dialog variants

/**
 * All possible system dialogs. Note: All Properties must be structurally clonable.
 */
export type SystemDialog =
    | AutoAppUpdateDownloadDialog
    | AutoAppUpdateFailedDialog
    | AutoAppUpdatePromptDialog
    | ConnectionErrorDialog
    | ServerAlertDialog
    | UnrecoverableStateDialog
    | InvalidWorkCredentialsDialog
    | ManualAppUpdateDialog
    | MissingDeviceCookieDialog
    | DeviceCookieMismatchDialog
    | D2dProtocolVersionIncompatibleDialog
    | ChangePasswordConfirmDialog;

/**
 * Base interface for all system dialogs.
 */
interface SystemDialogCommon {
    readonly type: string;
    readonly context?: unknown;
}

/**
 * Dialog indicating that an app update is downloading.
 */
export interface AutoAppUpdateDownloadDialog extends SystemDialogCommon {
    readonly type: 'auto-app-update-download';
    readonly context: AutoAppUpdateDownloadDialogContext;
}

export interface AutoAppUpdateDownloadDialogContext {
    /**
     * Name of the most recent available application version.
     */
    readonly latestVersion: string;
}

/**
 * Dialog indicating that an app update has failed.
 */
export interface AutoAppUpdateFailedDialog extends SystemDialogCommon {
    readonly type: 'auto-app-update-failed';
}

/**
 * Dialog indicating that an app update is downloading.
 */
export interface AutoAppUpdatePromptDialog extends SystemDialogCommon {
    readonly type: 'auto-app-update-prompt';
    readonly context: AutoAppUpdatePromptDialogContext;
}

export interface AutoAppUpdatePromptDialogContext {
    /**
     * Name of the currently installed application version.
     */
    readonly currentVersion: string;
    /**
     * Name of the most recent available application version.
     */
    readonly latestVersion: string;
}

/**
 * Dialog prompting user to confirm password change.
 */
export interface ChangePasswordConfirmDialog extends SystemDialogCommon {
    readonly type: 'change-password-confirm-dialog';
}

/**
 * Dialog blocking the application on a connection error which requires user interaction.
 */
export interface ConnectionErrorDialog extends SystemDialogCommon {
    readonly type: 'connection-error';
    readonly context: ConnectionErrorDialogContext;
}

export interface ConnectionErrorDialogContext {
    /**
     * The error to be displayed as the dialog's content.
     *
     * TODO(DESK-487): Add other user interactions.
     */
    readonly error:
        | 'client-update-required'
        | 'client-was-dropped'
        | 'device-slot-state-mismatch'
        | 'mediator-update-required';
}

/**
 * Dialog which is shown when the device cookies sent by the clients do not match.
 */
export interface DeviceCookieMismatchDialog extends SystemDialogCommon {
    readonly type: 'device-cookie-mismatch';
}

/**
 * Dialog which is shown on when work credentials are invalid.
 */
export interface InvalidWorkCredentialsDialog extends SystemDialogCommon {
    readonly type: 'invalid-work-credentials';
    readonly context: InvalidWorkCredentialsDialogContext;
}

export interface InvalidWorkCredentialsDialogContext {
    /**
     * The current work credentials.
     */
    readonly workCredentials: ThreemaWorkCredentials;
}

/**
 * Dialog indicating that an app update is available.
 */
export interface ManualAppUpdateDialog extends SystemDialogCommon {
    readonly type: 'manual-app-update';
    readonly context: ManualAppUpdateDialogContext;
}

export interface ManualAppUpdateDialogContext {
    /**
     * Name of the currently installed application version.
     */
    readonly currentVersion: string;
    /**
     * Name of the most recent available application version.
     */
    readonly latestVersion: string;
    /**
     * Details about the user's system.
     */
    readonly systemInfo: Omit<SystemInfo, 'os' | 'isSafeStorageAvailable'> & {
        readonly os: SystemInfo['os'];
    };
}

/**
 * Dialog which is shown when there is no device cookie
 */
export interface MissingDeviceCookieDialog extends SystemDialogCommon {
    readonly type: 'missing-device-cookie';
}

/**
 * Message from the server. Sent with CSP alert and close-error messages.
 */
export interface ServerAlertDialog extends SystemDialogCommon {
    readonly type: 'server-alert';
    readonly context: ServerAlertDialogContext;
}

export interface ServerAlertDialogContext {
    /**
     * The message of the server alert.
     */
    readonly text: string;
}

/**
 * Dialog which is shown on state errors (e.g. in Groups) in production mode.
 */
export interface UnrecoverableStateDialog extends SystemDialogCommon {
    readonly type: 'unrecoverable-state';
}

/**
 * Dialog which is shown when the protocol versions are incompatible
 */
export interface D2dProtocolVersionIncompatibleDialog extends SystemDialogCommon {
    readonly type: 'device-protocols-incompatible';
}

// Helper types & interfaces

// TODO(DESK-1582): Result should reflect possible available actions.
export type SystemDialogAction = 'confirmed' | 'dismissed';

export type SystemDialogHandle = {
    closed: Promise<SystemDialogAction>;
    setProgress: (progress: f64) => void;
} & ProxyMarked;

/**
 * Open a dialog window.
 *
 * Lives in the frontend thread.
 */
export interface SystemDialogService extends ProxyMarked {
    /**
     * Close all open system dialogs.
     */
    readonly closeAll: () => void;

    /**
     * Show the specified system dialog.
     *
     * If another dialog is already being shown, this dialog will be in the background until the
     * other dialog(s) are closed.
     */
    readonly open: (dialog: SystemDialog) => SystemDialogHandle;

    /**
     * Show the specified system dialog.
     *
     * If another dialog of the same type is already being shown, this dialog instance will not be
     * shown. Instead, a handle to the existing dialog will be returned.
     */
    readonly openOnce: (dialog: SystemDialog) => SystemDialogHandle;
}
