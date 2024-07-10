import type {ServicesForBackend} from '~/common/backend';
import type {Logger} from '~/common/logging';
import {assertUnreachable, unwrap} from '~/common/utils/assert';

/**
 * Check the work license supplied by the key storage.
 *
 * Note: This function must not be called before the joinProtocol has succeeded!
 */
export function workLicenseCheckJob(
    services: Pick<ServicesForBackend, 'systemDialog' | 'work' | 'keyStorage'>,
    log: Logger,
): void {
    const workCredentials = unwrap(
        services.keyStorage.workData?.get()?.workCredentials,
        'Require work credentials to run work license check job',
    );
    log.debug('Checking Threema work license');
    unwrap(services.work, 'Require work backend to run work license check job')
        .checkLicense(workCredentials)
        .then((result) => {
            if (result.valid) {
                log.debug('Threema Work license is valid');
            } else {
                log.error(`Threema Work credentials are invalid or expired: ${result.message}`);
                services.systemDialog
                    .openOnce({
                        type: 'invalid-work-credentials',
                        context: {
                            workCredentials,
                        },
                    })
                    .catch(assertUnreachable);
            }
        })
        .catch((error: unknown) => {
            log.error(`Work license check failed: ${error}`);
        });
}
