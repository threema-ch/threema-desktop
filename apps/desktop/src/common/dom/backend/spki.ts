import {dateToUnixTimestampMs} from '@threema/ts-utils/conversion/date-to-unix-timestamp-ms';

import type {EarlyBackendServicesThatDontRequireConfig} from '~/common/backend';
import {STATIC_CONFIG} from '~/common/config';
import {BackendCreationError} from '~/common/dom/backend';
import * as oppf from '~/common/dom/backend/onprem/oppf';
import type {LoggerFactory} from '~/common/logging';

export function recoverCertificatePins(
    phase1Services: EarlyBackendServicesThatDontRequireConfig,
    logging: LoggerFactory,
): (password: string) => Promise<{isRemoteSecretActive: boolean}> {
    return async (password: string) => {
        const log = logging.logger('backend.recover-certificate-pins');
        const {onPremConfig, workCredentials} =
            await phase1Services.keyStorage.readIntermediateContents(password);
        const isRemoteSecretActive = phase1Services.keyStorage.isRemoteSecretEncrypted;

        if (import.meta.env.BUILD_ENVIRONMENT !== 'onprem') {
            throw new BackendCreationError(
                'invalid-environment',
                'Certificate pin recovery is only available in OnPrem builds',
            );
        }

        if (workCredentials === undefined) {
            throw new BackendCreationError(
                'missing-work-credentials',
                'No work credentials found in key storage',
            );
        }

        if (onPremConfig?.oppfUrl === undefined) {
            throw new BackendCreationError('missing-oppf-url', 'No OPPF URL found in key storage');
        }

        const oppfUrl = onPremConfig.oppfUrl;
        const fallbackUrl = oppfUrl.replace(/\.oppf$/u, '.fallback.oppf');

        log.debug(`Fetching fallback OPPF from: ${fallbackUrl}`);

        let responseStatus: number;
        try {
            responseStatus = await phase1Services.electron.checkFallbackOppFile(
                fallbackUrl,
                STATIC_CONFIG.USER_AGENT,
            );
        } catch (error) {
            throw new BackendCreationError(
                'fetch-oppf-error',
                'Unable to detect enabled OPPF fallback endpoint',
                {from: error},
            );
        }
        switch (responseStatus) {
            case 400:
                throw new BackendCreationError(
                    'fetch-oppf-error',
                    "OPPF fallback mustn't send a authorization header",
                );
            case 429:
                throw new BackendCreationError(
                    'fetch-oppf-error',
                    'License check exceeded quota per IP per minute',
                );
            case 404:
                throw new BackendCreationError(
                    'fetch-oppf-error',
                    'Temporary OPPF fallback endpoint has not been activated',
                );
            case 500:
                throw new BackendCreationError(
                    'fetch-oppf-error',
                    'Failed to provide the OPPF fallback',
                );
            default: {
                if (responseStatus !== 200) {
                    throw new BackendCreationError(
                        'fetch-oppf-error',
                        `Unable to fetch OPPF fallback, received status code ${responseStatus}`,
                    );
                }

                break;
            }
        }

        let fallbackOppfData: ArrayBuffer | undefined;
        // Fetch fallback OPPF (this uses an isolated session that bypasses cert validation)
        try {
            fallbackOppfData = await phase1Services.electron.getFallbackOppFile(
                fallbackUrl,
                STATIC_CONFIG.USER_AGENT,
            );
        } catch (error) {
            throw new BackendCreationError('fetch-oppf-error', 'Unable to get OPPF fallback', {
                from: error,
            });
        }

        let oppfFile: {readonly parsed: oppf.OppfFile; readonly string: string};
        // Verify the OPPF file
        try {
            oppfFile = oppf.verifyOppfFile(
                phase1Services,
                STATIC_CONFIG.ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS,
                new Uint8Array(fallbackOppfData),
            );
        } catch (error) {
            throw new BackendCreationError(
                'verify-oppf-file-error',
                'Unable to verify the OPPF fallback file',
                {from: error},
            );
        }

        log.debug('Verified on prem config');

        // Update certificate pins in electron-main
        try {
            await phase1Services.electron.updatePublicKeyPins(oppfFile.parsed.domains?.rules);
        } catch (error) {
            throw new BackendCreationError(
                'update-public-key-pins-error',
                'Updating public key pins failed',
                {from: error},
            );
        }

        log.debug('Certificate pins updated successfully');

        try {
            await phase1Services.keyStorage.setOnPremConfig(password, {
                oppfCachedConfig: oppfFile.string,
                oppfUrl,
                lastUpdated: dateToUnixTimestampMs(new Date()),
            });
        } catch (error) {
            throw new BackendCreationError(
                'update-onprem-config-error',
                'Caching new oppf config in keystorage failed',
                {from: error},
            );
        }

        log.debug('Update cached onprem config');

        return {isRemoteSecretActive};
    };
}
