import type {ServicesForBackend} from '~/common/backend';
import type {Logger} from '~/common/logging';
import {assertUnreachable, unwrap} from '~/common/utils/assert';

export function workLicenseCheckJob(
    services: Pick<ServicesForBackend, 'device' | 'systemDialog' | 'work'>,
    log: Logger,
): void {
    log.debug('Checking Threema work license');
    unwrap(services.work, 'Require work backend to run work license check job')
        .checkLicense()
        .then((result) => {
            if (result.valid) {
                log.debug('Threema Work license is valid');
            } else {
                log.error(`Threema Work credentials are invalid or expired: ${result.message}`);
                // TODO(DESK-1227) Revert the commit that added this comment!
                if (import.meta.env.BUILD_ENVIRONMENT === 'onprem') {
                    services.systemDialog
                        .openOnce({
                            type: 'invalid-work-credentials',
                            context: unwrap(
                                services.device.workData,
                                'Require work data to run work license check job',
                            ),
                        })
                        .catch(assertUnreachable);
                }
            }
        })
        .catch((error) => {
            log.error(`Work license check failed: ${error}`);
        });
}
