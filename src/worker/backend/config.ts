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
    LOG_DEFAULT_STYLE:
        'color: #fff; background-color: #0096ff; padding: .2em .3em; border-radius: 4px;',
};
