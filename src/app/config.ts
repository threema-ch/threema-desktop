import {createLoggerStyle} from '~/common/logging';
import {type u53} from '~/common/types';

/**
 * App configuration.
 */
interface AppConfig {
    /**
     * Default style for logging.
     */
    readonly LOG_DEFAULT_STYLE: string;

    /**
     * Minimum password length
     */
    readonly MIN_PASSWORD_LENGTH: u53;
}

/**
 * Default app configuration.
 */
export const APP_CONFIG: AppConfig = {
    LOG_DEFAULT_STYLE: createLoggerStyle('#05a63f', '#ffffff'),
    MIN_PASSWORD_LENGTH: import.meta.env.DEBUG ? 1 : 8,
};
