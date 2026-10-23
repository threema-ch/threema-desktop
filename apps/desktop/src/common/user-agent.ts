import {STATIC_CONFIG} from '~/common/config';
import type {SystemInfo} from '~/common/electron-ipc';

/**
 * Builds a specific user agent used for the updater including OS version, release and architecture.
 *
 * Note: We need this information for sunsetting Windows 10 so the server responds with the right
 * information for the different Windows versions.
 */
export function buildUpdaterUserAgent(info: Pick<SystemInfo, 'os' | 'osRelease' | 'arch'>): string {
    function clean(value: string): string {
        return (
            value
                // eslint-disable-next-line threema/ban-stateful-regex-flags
                .replaceAll(/[^\x20-\x7E]/gu, '?')
                .replaceAll('"', "'")
                .replaceAll('\\', '/')
                .replaceAll('(', '[')
                .replaceAll(')', ']')
        );
    }

    return `${STATIC_CONFIG.USER_AGENT} Updater ("${clean(info.os)}"; "${clean(info.osRelease)}"; "${clean(info.arch)}")`;
}
