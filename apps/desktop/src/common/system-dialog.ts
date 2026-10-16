import type {f64} from '@threema/ts-utils/float/f64';

import type {ThreemaWorkCredentials} from '~/common/device';
import type {ScreenSharingSource, SystemInfo} from '~/common/electron-ipc';
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
    | DeviceCookieMismatchDialog
    | D2dProtocolVersionIncompatibleDialog
    | ChangePasswordConfirmDialog
    | ScreenSharingPickerDialog
    | RemoteSecretsActivationDialog
    | RemoteSecretsDeactivationDialog
    | RemoteSecretsSystemSuspendDialog
    | Windows10MigrationDialog;

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
    /**
     * Details about the user's system.
     */
    readonly systemInfo: Pick<SystemInfo, 'os'>;
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
    readonly systemInfo: Pick<SystemInfo, 'os'>;
}

/**
 * Dialog for the custom screen sharing picker.
 */
export interface ScreenSharingPickerDialog extends SystemDialogCommon {
    readonly type: 'screen-sharing-picker';
    readonly context: ScreenSharingPickerDialogContext;
}

export interface ScreenSharingPickerDialogContext {
    /**
     * Electron capture sources for screen sharing.
     */
    readonly sources: ScreenSharingSource[];
    readonly onselect: (sourceId: string) => void;
    readonly ondismiss: () => void;
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
 * Dialog which is shown when the protocol versions are incompatible.
 */
export interface D2dProtocolVersionIncompatibleDialog extends SystemDialogCommon {
    readonly type: 'device-protocols-incompatible';
}

/**
 * Dialog which is shown when remote secret is activated.
 */
export interface RemoteSecretsActivationDialog extends SystemDialogCommon {
    readonly type: 'remote-secrets-activation';
    readonly context: RemoteSecretsActivationDialogContext;
}

export interface RemoteSecretsActivationDialogContext {
    readonly previouslyAttemptedPassword: string | undefined;
}

/**
 * Dialog which is shown when remote secret is deactivated.
 */
export interface RemoteSecretsDeactivationDialog extends SystemDialogCommon {
    readonly type: 'remote-secrets-deactivation';
    readonly context: RemoteSecretsDeactivationDialogContext;
}

/**
 * Dialog which is shown when a system suspend restart was requested when remote secret is activated
 * and the password is stored in the keychain.
 */
export interface RemoteSecretsSystemSuspendDialog extends SystemDialogCommon {
    readonly type: 'remote-secrets-system-suspend';
}

export interface RemoteSecretsDeactivationDialogContext {
    readonly previouslyAttemptedPassword: string | undefined;
}

/**
 * Dialog informing the user that Windows 10 needs to migrate, and that they will therefore not
 * receive any further app updates.
 */
export interface Windows10MigrationDialog extends SystemDialogCommon {
    readonly type: 'windows-10-migration';
}

// Helper types & interfaces

// TODO(DESK-1582): Result should reflect possible available actions.
export type SystemDialogAction =
    | {readonly type: 'confirmed'; readonly value?: string}
    | {readonly type: 'dismissed'};

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
