import type {ServicesForBackend} from '~/common/backend';
import type {ThreemaWorkData} from '~/common/device';
import {workLicenseCheck} from '~/common/dom/network/protocol/work-license-check';
import type {Logger} from '~/common/logging';
import {assertUnreachable} from '~/common/utils/assert';

export function workLicenseCheckJob(
    workData: ThreemaWorkData,
    services: ServicesForBackend,
    log: Logger,
): void {
    const {systemDialog, systemInfo} = services;

    log.debug('Checking Threema work license');
    workLicenseCheck(
        services.config.DIRECTORY_SERVER_URL,
        workData.workCredentials,
        systemInfo,
        log,
    )
        .then((result) => {
            if (result.valid) {
                log.debug('Threema Work license is valid');
            } else {
                log.error(`Threema Work credentials are invalid or expired: ${result.message}`);
                systemDialog
                    .openOnce({
                        type: 'invalid-work-credentials',
                        context: {
                            workCredentials: workData.workCredentials,
                        },
                    })
                    .catch(assertUnreachable);
            }
        })
        .catch((error) => {
            log.error(`Work license check failed: ${error}`);
        });
}
