import * as fs from 'node:fs';
import * as path from 'node:path';

import type {Logger} from '~/common/logging';

export function getLatestProfilePath(
    appPath: string,
    profile: string,
    log: Logger,
): string | undefined {
    const oldProfiles: string[] = findOldProfiles(appPath, profile);
    if (oldProfiles.length === 0) {
        log.info('No old profile to restore found');
        return undefined;
    }
    log.info(`Found an old profile at ${oldProfiles.sort().at(-1)}`);
    return oldProfiles.sort().at(-1);
}

export function removeOldProfiles(appPath: string, profile: string, log: Logger): void {
    const oldProfiles = findOldProfiles(appPath, profile);
    const deleted: string[] = [];
    for (const oldProfile of oldProfiles) {
        if (fs.lstatSync(oldProfile).isDirectory()) {
            fs.rmSync(oldProfile, {recursive: true, force: true});
            deleted.push(oldProfile);
        }
    }
    log.info(`Deleted the following old profiles: ${deleted}`);
}

function findOldProfiles(appPath: string, profile: string): string[] {
    const files = fs.readdirSync(path.join(appPath, '..'));
    const oldProfiles: string[] = [];
    const profileDirPattern = `^${import.meta.env.BUILD_FLAVOR}-${profile}\\.[0-9]{10}$`;

    // Find all profile directories where the directory name ends with a timestamp and where a key
    // storage file exists.
    for (const file of files) {
        if (file.match(profileDirPattern)) {
            const profileDirPath = path.resolve(appPath, '..', file);
            const keyStoragePath = path.join(profileDirPath, 'data', 'keystorage.pb3');
            if (fs.lstatSync(keyStoragePath, {throwIfNoEntry: false})?.isFile() === true) {
                oldProfiles.push(path.resolve(appPath, '..', file));
            }
        }
    }

    return oldProfiles;
}
