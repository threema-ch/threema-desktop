import type {u53} from '@threema/ts-utils/integer/u53';

import type {RemoteSecretErrorType} from '~/common/remote-secret';
import type {DomainCertificatePin} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

/**
 * Exposes functions that require communication with the electron main thread through the electron IPC.
 *
 * Lives in the frontend thread.
 */
export interface IFrontendElectronService extends ProxyMarked {
    /**
     * Forwards domain certificate pins to the main thread to register them in the current session.
     */
    readonly updatePublicKeyPins: (newPins: DomainCertificatePin[] | undefined) => Promise<boolean>;
    /**
     * Remove all old profiles from the file system.
     */
    readonly removeOldProfiles: () => void;
    /**
     * Restart the app and install an update.
     */
    readonly restartAppAndInstallUpdate: () => void;
    /**
     * Log to file.
     */
    readonly logToFile: (
        level: 'trace' | 'debug' | 'info' | 'warn' | 'error',
        data: string,
    ) => Promise<void>;

    /**
     * Restart the app.
     */
    readonly restartApp: () => void;
    /**
     * Return the {@link RemoteSecretErrorType} the app was launched with, if any.
     */
    readonly getRemoteSecretLaunchParameter: () => RemoteSecretErrorType | undefined;
    /**
     * Restart the app with the given {@link RemoteSecretErrorType} as the reason.
     */
    readonly remoteSecretErrorRestartApp: (errorType: RemoteSecretErrorType) => void;
    /**
     * Restart the app because of a system suspension when remote secret is active.
     */
    readonly remoteSecretSystemSuspensionRestartApp: () => void;
    /**
     * Whether or not the app was started due to a system suspense when remote secret is active.
     */
    readonly remoteSecretSystemSuspensionRestartParameter: () => boolean;

    /**
     * Check if the OPPF is available in an isolated session.
     */
    readonly checkOppFile: (
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ) => Promise<u53>;

    /**
     * Fetch the OPPF in an isolated session.
     */
    readonly getOppFile: (
        oppfUrl: string,
        username: string,
        password: string,
        userAgent: string,
    ) => Promise<ArrayBuffer>;

    /**
     * Check if the fallback OPPF is available in an isolated session.
     */
    readonly checkFallbackOppFile: (oppfUrl: string, userAgent: string) => Promise<u53>;

    /**
     * Fetch the fallback OPPF in an isolated session.
     */
    readonly getFallbackOppFile: (oppfUrl: string, userAgent: string) => Promise<ArrayBuffer>;

    /**
     * Execute a callback that can be awaited before doing an app restart.
     */
    readonly beforeRestart: () => Promise<void>;

    /**
     * Execute a callback that can be used to execute any invalid certificate pin logic.
     */
    readonly registerInvalidCertificatePins: (callback: () => Promise<void>) => void;

    /**
     * Directly trigger the INVALID_CERTIFICATE_PINS flow without needing a real TLS request.
     * Only available in non-production builds.
     */
    readonly triggerInvalidCertificatePins: () => Promise<void>;

    /**
     * Signal to the electron main thread that the app is ready to restart.
     */
    readonly signalRestartReady: () => Promise<void>;
}
