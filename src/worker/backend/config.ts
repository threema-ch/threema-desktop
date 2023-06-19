import {createLoggerStyle} from '~/common/logging';

/**
 * Backend worker configuration.
 */
interface BackendWorkerConfig {
    /**
     * Default style for logging.
     */
    readonly LOG_DEFAULT_STYLE: string;
}

/**
 * Default backend worker configuration.
 */
export const BACKEND_WORKER_CONFIG: BackendWorkerConfig = {
    LOG_DEFAULT_STYLE: createLoggerStyle('#0096ff', '#ffffff'),
};
