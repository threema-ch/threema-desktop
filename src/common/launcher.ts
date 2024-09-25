import type {DeleteProfileOptions} from '~/common/electron-ipc';
import type {ProxyMarked} from '~/common/utils/endpoint';

/**
 * Control the app launcher.
 *
 * Lives in the frontend thread.
 */
export interface LauncherService extends ProxyMarked {
    /**
     * Close the app using the launcher.
     */
    readonly close: () => void;

    /**
     * Delete the profile and restart the app using the launcher.
     */
    readonly deleteProfileAndRestart: (options: DeleteProfileOptions) => void;

    /**
     * Restart the app using the launcher.
     */
    readonly restart: () => void;

    /**
     * Restart the app and install an update using the launcher. Note: The update must be
     * pre-downloaded to the temp directory.
     */
    readonly restartAndInstallUpdate: () => void;
}
