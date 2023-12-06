import type {LogInfo} from '~/common/node/file-storage/log-info';

/**
 * Props accepted by the `ToggleLoggerModal` component.
 */
export interface ToggleLoggerModalProps {
    readonly isLoggerEnabled: boolean;
    readonly logInfo: LogInfo;
}
