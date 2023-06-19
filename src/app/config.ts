import {createLoggerStyle} from '~/common/logging';

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
    LOG_DEFAULT_STYLE: createLoggerStyle('#05a63f', '#ffffff'),
};
