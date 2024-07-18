import type {ThreemaWorkCredentials} from '~/common/device';
import type {SystemInfo} from '~/common/electron-ipc';
import type {ProxyMarked} from '~/common/utils/endpoint';

/**
 * Base interface for all system dialogs.
 */
interface SystemDialogBase {
    readonly type: string;
    readonly context?: unknown;
}

/**
 * Dialog indicating that an app update is available.
 */
export interface AppUpdateDialog extends SystemDialogBase {
    readonly type: 'app-update';
    readonly context: {
        readonly currentVersion: string;
        readonly latestVersion: string;
        readonly systemInfo: SystemInfo;
    };
}

/**
 * Dialog blocking the application on a connection error which requires user interaction.
 */
export interface ConnectionErrorDialog extends SystemDialogBase {
    readonly type: 'connection-error';
    readonly context: ConnectionErrorContext;
}
type ConnectionErrorContext =
    | {
          readonly type: 'mediator-update-required';
          readonly userCanReconnect: true;
      }
    | {
          readonly type: 'client-update-required';
          readonly userCanReconnect: false;
      }
    | {
          readonly type: 'client-was-dropped';
          readonly userCanReconnect: false;
      }
    | {
          readonly type: 'device-slot-state-mismatch';
          readonly userCanReconnect: false;
          readonly clientExpectedState: 'new';
      };
// TODO(DESK-487): Add other user interactions
// TODO(DESK-1337): Above properties are confusing / dead code

/**
 * Message from the server. Sent with CSP alert and close-error messages.
 */
export interface ServerAlertDialog extends SystemDialogBase {
    readonly type: 'server-alert';
    readonly context: {
        readonly text: string;
    };
}

/**
 * Dialog which is shown on state errors (e.g. in Groups) in production mode.
 */
export interface UnrecoverableStateDialog extends SystemDialogBase {
    readonly type: 'unrecoverable-state';
}

/**
 * Dialog which is shown on when work credentials are invalid.
 */
export interface InvalidWorkCredentialsDialog extends SystemDialogBase {
    readonly type: 'invalid-work-credentials';
    readonly context: {
        /**
         * The current work credentials.
         */
        readonly workCredentials: ThreemaWorkCredentials;
    };
}

/**
 * Dialog which is shown when the device cookies sent by the clients do not match
 */
export interface DeviceCookieMismatchDialog extends SystemDialogBase {
    readonly type: 'device-cookie-mismatch';
}

/**
 * Dialog which is shown when there is no device cookie
 */
export interface MissingDeviceCookieDialog extends SystemDialogBase {
    readonly type: 'missing-device-cookie';
}

/**
 * All possible system dialogs.
 * Note: All Properties must be structurally clonable.
 */
export type SystemDialog =
    | AppUpdateDialog
    | ConnectionErrorDialog
    | ServerAlertDialog
    | UnrecoverableStateDialog
    | InvalidWorkCredentialsDialog
    | MissingDeviceCookieDialog
    | DeviceCookieMismatchDialog;

// TODO(DESK-1337): Result should reflect possible available actions
export type DialogAction = 'confirmed' | 'cancelled';

export type SystemDialogHandle = {
    closed: Promise<DialogAction>;
} & ProxyMarked;

/**
 * Open a dialog window.
 *
 * Lives in the frontend / app thread.
 */
export interface SystemDialogService extends ProxyMarked {
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
