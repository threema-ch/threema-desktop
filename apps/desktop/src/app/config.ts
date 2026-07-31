import type {u53} from '@threema/ts-utils/integer/u53';

import {createLoggerStyle} from '~/common/logging';

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
    /**
     * Minimum password length suggested to a user. This is not meant to be
     * enforced for every interaction with a password or password input. It's
     * meant to be a guidance for the user to choose a password with a
     * sufficient minimum length.
     *
     * IMPORTANT: Only use this to enforce a length when setting a password and
     * not when a password is requested from the user. This prevents possible
     * future problems like locking a user out because we increased this
     * constant and the user password becomes to short.
     */
    MIN_PASSWORD_LENGTH: import.meta.env.DEBUG ? 1 : 8,
};
