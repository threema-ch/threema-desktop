/**
 * An auto-restore file may be used to automatically restore a safe backup when no keystore exists.
 *
 * To make use of this functionality, write a Threema Safe backup JSON into a file at
 * `identities/safe.<identity>.json`. (Note: If multiple files match this pattern, then one is
 * chosen at random.)
 */

import {SAFE_SCHEMA, type SafeBackupData} from '~/common/dom/safe';
import {CONSOLE_LOGGER} from '~/common/logging';
import {type IdentityString, isIdentityString} from '~/common/network/types';

const identityFiles = import.meta.globEager<string>('/../identities/safe.*.json', {
    as: 'raw',
});

interface AutorestoreData {
    identity: IdentityString;
    backupData: SafeBackupData;
}

export let SAFE_BACKUP_AUTORESTORE: AutorestoreData | undefined = undefined;

if (import.meta.env.DEBUG) {
    const log = CONSOLE_LOGGER;
    for (const [filepath, contents] of Object.entries(identityFiles)) {
        // If the identity in this file is valid, and if the contents can be parsed as JSON, load
        // this file and abort the loop. Otherwise, continue with the next matching file.
        const match = filepath.match(/\/safe\.(?<identity>.{8})\.json$/u);
        if (match?.groups?.identity !== undefined && isIdentityString(match.groups.identity)) {
            // Parse JSON
            let rawBackupData;
            try {
                rawBackupData = JSON.parse(contents);
            } catch (error) {
                log.warn(`Ignoring Safe backup file ${filepath}: Invalid JSON`);
                continue;
            }

            // Validate against Safe schema
            let backup;
            try {
                backup = SAFE_SCHEMA.parse(rawBackupData);
            } catch (error) {
                log.warn(`Ignoring Safe backup file ${filepath}: Not a valid Safe backup`);
                continue;
            }

            // Valid, we're done
            SAFE_BACKUP_AUTORESTORE = {
                identity: match.groups.identity,
                backupData: backup,
            };
            break;
        } else {
            log.warn(`Ignoring Safe backup file ${filepath}: Does not contain a valid identity`);
        }
    }
}
