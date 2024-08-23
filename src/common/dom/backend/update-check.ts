import type {EarlyBackendServicesThatDontRequireConfig} from '~/common/backend';
import {checkForUpdate} from '~/common/dom/update-check';
import type {SystemInfo} from '~/common/electron-ipc';
import {assertUnreachable} from '~/common/utils/assert';

/**
 * Check if there is an update available on {@link Config.UPDATE_SERVER_URL} and open the
 * corresponding system dialog.
 */
export async function updateCheck(
    services: Pick<EarlyBackendServicesThatDontRequireConfig, 'logging' | 'systemDialog'>,
    systemInfo: SystemInfo,
): Promise<void> {
    const {logging} = services;
    const log = logging.logger('update-check');
    log.info('Checking for updates...');

    // Check for updates. If update is found, notify user if the request succeeds.
    const updateInfo = await checkForUpdate(log, systemInfo);
    if (updateInfo !== undefined) {
        log.info(`Update available: ${updateInfo.version}`);
        await services.systemDialog
            .open({
                type: 'app-update',
                context: {
                    currentVersion: import.meta.env.BUILD_VERSION,
                    latestVersion: updateInfo.version,
                    systemInfo,
                },
            })
            .catch(assertUnreachable);
    } else {
        log.info('No update found');
    }
}
