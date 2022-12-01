/**
 * Service worker configuration.
 */
export interface ServiceWorkerConfig {
    /**
     * URL paths of assets to be preloaded by the service worker.
     */
    readonly PRELOAD_ASSETS: ReadonlySet<string>;

    /**
     * Default style for logging.
     */
    readonly LOG_DEFAULT_STYLE: string;

    /**
     * Whether to log network requests verbosely.
     */
    readonly VERBOSE_REQUEST_LOGGING: boolean;
}

/**
 * Default service worker configuration.
 */
export const SERVICE_WORKER_CONFIG: ServiceWorkerConfig = {
    PRELOAD_ASSETS: new Set(import.meta.outputFiles ?? ([] as const)),
    LOG_DEFAULT_STYLE:
        'color: #fff; background-color: #5e35b1; padding: .2em .3em; border-radius: 4px;',
    VERBOSE_REQUEST_LOGGING: import.meta.env.DEBUG,
};
