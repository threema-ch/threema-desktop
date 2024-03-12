import type {ServicesForBackend} from '~/common/backend';
import type {Logger} from '~/common/logging';
import {assertUnreachable, unwrap} from '~/common/utils/assert';

export function workLicenseCheckJob(
    services: Pick<ServicesForBackend, 'device' | 'systemDialog' | 'work'>,
    log: Logger,
): void {
    const {workCredentials} = unwrap(
        services.device.workData,
        'Require work data to run work license check job',
    );
    log.debug('Checking Threema work license');
    unwrap(services.work, 'Require work backend to run work license check job')
        .checkLicense()
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
        .catch((error) => {
            log.error(`Work license check failed: ${error}`);
        });
}
