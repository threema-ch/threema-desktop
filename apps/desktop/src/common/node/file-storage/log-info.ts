/**
 * This interface exposes information about log files to the frontend
 */

import type {u53} from '@threema/ts-utils/integer/u53';

export interface LogInfo {
    readonly logFiles: {
        readonly mainApplication: LogFileInfo;
        readonly backendWorker: LogFileInfo;
    };
}

export interface LogFileInfo {
    readonly sizeInBytes: u53;
    readonly path: string;
}
