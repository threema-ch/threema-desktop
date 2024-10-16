import * as os from 'node:os';
import * as process from 'node:process';

import {assert, unreachable} from '~/common/utils/assert';

/**
 * Return the path to the platform-specific application data base directory.
 *
 * - Linux / BSD: $XDG_DATA_HOME/ThreemaDesktop/ or ~/.local/share/ThreemaDesktop/
 * - macOS: ~/Library/Application Support/ThreemaDesktop/
 * - Windows: %APPDATA%/ThreemaDesktop/
 * - Other: ~/.ThreemaDesktop/
 */
export function getPersistentAppDataBaseDir(): string[] {
    const rootDirectoryName = 'ThreemaDesktop';
    switch (process.platform) {
        case 'linux':
        case 'freebsd':
        case 'netbsd':
        case 'openbsd':
        case 'sunos': {
            // Note: Don't use dot notation below, see https://stackoverflow.com/a/72403165/284318
            // eslint-disable-next-line @typescript-eslint/dot-notation
            const XDG_DATA_HOME = (process.env['XDG_DATA_HOME'] ?? '').trim();
            if (XDG_DATA_HOME.length > 0) {
                return [XDG_DATA_HOME, rootDirectoryName];
            }
            return [os.homedir(), '.local', 'share', rootDirectoryName];
        }
        case 'darwin':
            return [os.homedir(), 'Library', 'Application Support', rootDirectoryName];
        case 'win32': {
            // Note: Don't use dot notation below, see https://stackoverflow.com/a/72403165/284318
            // eslint-disable-next-line @typescript-eslint/dot-notation
            const appData = process.env['APPDATA'];
            assert(appData !== undefined && appData !== '', '%APPDATA% is undefined or empty');
            return [appData, rootDirectoryName];
        }
        case 'aix':
        case 'android':
        case 'cygwin':
        case 'haiku':
            return [os.homedir(), `.${rootDirectoryName}`];
        default:
            return unreachable(process.platform);
    }
}
