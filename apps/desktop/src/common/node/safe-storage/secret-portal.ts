import {execFile} from 'node:child_process';
import * as fs from 'node:fs';

import type {Logger} from '~/common/logging';

/**
 * Chromium feature that makes `safeStorage` encrypt with the key from the Secret portal (ciphertext
 * prefix `v12`). Enabled in the Flatpak `run-wrapper.sh`.
 */
export const SECRET_PORTAL_ENCRYPTION_FEATURE = 'SecretPortalKeyProviderUseForEncryption';

/**
 * Timeout for the D-Bus call to the portal, so that a hanging session bus cannot block the startup.
 */
const SECRET_PORTAL_CHECK_TIMEOUT_MS = 5000;

/**
 * Returns whether the app runs inside a Flatpak sandbox.
 */
export function isRunningInFlatpak(): boolean {
    return fs.existsSync('/.flatpak-info');
}

/**
 * Returns whether the given value of the `--enable-features` switch contains
 * {@link SECRET_PORTAL_ENCRYPTION_FEATURE}.
 */
export function hasSecretPortalEncryptionFeature(enableFeaturesSwitchValue: string): boolean {
    return enableFeaturesSwitchValue
        .split(',')
        .some((feature) => feature.trim() === SECRET_PORTAL_ENCRYPTION_FEATURE);
}

/**
 * Checks whether the host provides the Secret portal (`org.freedesktop.portal.Secret`), by reading
 * its `version` property via `gdbus` (part of the Flatpak runtime). Talking to the portal does not
 * require any additional Flatpak permission.
 *
 * Any error (e.g. "No such interface", `gdbus` missing, timeout) is treated as "not available".
 */
export async function isSecretPortalAvailable(log: Logger): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
        execFile(
            'gdbus',
            [
                'call',
                '--session',
                '--dest',
                'org.freedesktop.portal.Desktop',
                '--object-path',
                '/org/freedesktop/portal/desktop',
                '--method',
                'org.freedesktop.DBus.Properties.Get',
                'org.freedesktop.portal.Secret',
                'version',
            ],
            {timeout: SECRET_PORTAL_CHECK_TIMEOUT_MS},
            (error, stdout, stderr) => {
                if (error !== null) {
                    log.info(
                        `Secret portal check failed: ${error.message.trim()} ${stderr.trim()}`.trim(),
                    );
                    resolve(false);
                    return;
                }
                log.info(`Secret portal check succeeded: version ${stdout.trim()}`);
                resolve(true);
            },
        );
    });
}
