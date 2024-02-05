/**
 * Simple update checks.
 */

import * as v from '@badrap/valita';

import type {StaticConfig} from '~/common/config';
import type {SystemInfo} from '~/common/electron-ipc';
import type {Logger} from '~/common/logging';

const UPDATE_INFO_SCHEMA = v
    .object({
        latestVersion: v
            .object({
                version: v.string(),
                versionCode: v.number(),
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

export type UpdateInfo = Pick<
    v.Infer<typeof UPDATE_INFO_SCHEMA>['latestVersion'],
    'version' | 'versionCode'
>;

/**
 * Check whether an app update is available.
 *
 * If an update is available, {@link UpdateInfo} is returned. Otherwise, `undefined` is returned.
 *
 * If checking for an update fails, an error is logged and `undefined` is returned.
 */
export async function checkForUpdate(
    staticConfig: StaticConfig,
    log: Logger,
    systemInfo: SystemInfo,
): Promise<UpdateInfo | undefined> {
    // Prepare download check URL
    if (systemInfo.os === 'other') {
        log.warn(`Unsupported OS, cannot check for updates.`);
        return undefined;
    }
    const updateJson = `latest-version-${import.meta.env.BUILD_VARIANT}-${systemInfo.os}.json`;
    const downloadCheckUrl = `${staticConfig.UPDATE_SERVER_URL}${updateJson}`;

    // Download JSON
    let response: Response;
    try {
        const headers = new Headers({
            'user-agent': staticConfig.USER_AGENT,
            'accept': 'application/json',
        });
        response = await fetch(downloadCheckUrl, {
            method: 'GET',
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers,
        });
    } catch (error) {
        log.error(`Update check request failed: ${error}`);
        return undefined;
    }

    // Handle response status code
    if (response.status !== 200) {
        log.error(`Update check request returned HTTP ${response.status} (${response.statusText})`);
        return undefined;
    }

    // Parse response
    let updateInfo: UpdateInfo;
    try {
        const data = (await response.json()) as unknown;
        updateInfo = UPDATE_INFO_SCHEMA.parse(data).latestVersion;
    } catch (error) {
        log.error(`Could not parse update info JSON: ${error}`);
        return undefined;
    }

    // Return update info only if an update is available
    if (updateInfo.versionCode > import.meta.env.BUILD_VERSION_CODE) {
        return updateInfo;
    }
    return undefined;
}
