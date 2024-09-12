import type {LogInfo} from '~/common/node/file-storage/log-info';

/**
 * Props accepted by the `ClearLogsModal` component.
 */
export interface ClearLogsModalProps {
    readonly logInfo: LogInfo;
}
