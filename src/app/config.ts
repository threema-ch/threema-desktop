/**
 * App configuration.
 */
interface AppConfig {
    /**
     * Default style for logging.
     */
    readonly LOG_DEFAULT_STYLE: string;
}

/**
 * Default app configuration.
 */
export const APP_CONFIG: AppConfig = {
    LOG_DEFAULT_STYLE:
        'color: #fff; background-color: #05a63f; padding: .2em .3em; border-radius: 4px;',
};
