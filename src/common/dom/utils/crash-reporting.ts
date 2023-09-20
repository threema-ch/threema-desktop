import * as Sentry from '@sentry/browser';

import {type Logger} from '~/common/logging';
import {filterUndefinedProperties} from '~/common/utils/object';

let crashReportingInitialized = false;

/**
 * In internal test builds on sandbox, set up crash reporting.
 *
 * No automatic crash reporting or telemetry of any kind is being done in production builds!
 */
export function initCrashReportingInSandboxBuilds(log: Logger): void {
    if (import.meta.env.SENTRY_DSN === undefined) {
        return;
    }
    log.debug('Init crash reporting');
    Sentry.init({
        dsn: import.meta.env.SENTRY_DSN,

        // Version info
        release: `${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_VERSION_CODE})`,
        environment: import.meta.env.MODE,
        initialScope: {
            tags: {
                appName: import.meta.env.APP_NAME,
                debug: import.meta.env.DEBUG,
                buildTarget: import.meta.env.BUILD_TARGET,
                buildVariant: import.meta.env.BUILD_VARIANT,
                buildEnvironment: import.meta.env.BUILD_ENVIRONMENT,
            },
        },

        // Disable all default integrations (e.g. unhandled exception handler)
        defaultIntegrations: false,

        // Explicitly disable session tracking
        autoSessionTracking: false,

        // We want some error context
        attachStacktrace: true,
        integrations: [new Sentry.Breadcrumbs()],
    });
    crashReportingInitialized = true;
}

export function handleError(message: string, logTag?: string, error?: Error): void {
    if (!crashReportingInitialized) {
        return;
    }
    const tags = filterUndefinedProperties({logTag});
    if (error !== undefined) {
        Sentry.captureException(error, {tags, extra: {message}});
    } else {
        Sentry.captureMessage(message, {tags, level: 'error'});
    }
}
