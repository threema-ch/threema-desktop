import type {SystemInfo} from '~/common/electron-ipc';

/**
 * Props accepted by the `AppUpdateDialog` component.
 */
export interface AppUpdateDialogProps {
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
    readonly systemInfo: SystemInfo;
}
