import type {ServicesForBackend} from '~/common/backend';
import type {ThreemaWorkData} from '~/common/device';
import {workLicenseCheck} from '~/common/dom/network/protocol/work-license-check';
import type {Logger} from '~/common/logging';

export function workLicenseCheckJob(
    workData: ThreemaWorkData,
    services: ServicesForBackend,
    log: Logger,
): void {
    const {systemDialog, systemInfo} = services;

    log.debug('Checking Threema work license');
    workLicenseCheck(workData.workCredentials, systemInfo, log)
        .then((result) => {
            if (result.valid) {
                log.debug('Threema Work license is valid');
            } else {
                log.error(`Threema Work credentials are invalid or expired: ${result.message}`);
                void systemDialog.openOnce({
                    type: 'invalid-work-credentials',
                    context: {
                        workCredentials: workData.workCredentials,
                    },
                });
            }
        })
        .catch((error) => {
            log.error(`Work license check failed: ${error}`);
        });
}
