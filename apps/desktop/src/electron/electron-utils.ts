import * as os from 'node:os';
import path from 'node:path';
import * as process from 'node:process';

import {base64ToU8a} from '@threema/ts-utils/base64/base64-to-u8a';
import {u8aToBase64} from '@threema/ts-utils/base64/u8a-to-base64';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import type {u53} from '@threema/ts-utils/integer/u53';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as electron from 'electron';
import type {WebContents} from 'electron/main';

import type {ScreenSharingReminderDetails, ScreenSharingSource} from '~/common/electron-ipc';
import {ScreenSharingReminderIpcCommand} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {ensureSpkiValue} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {createTlsCertificateVerifier} from '~/electron/tls-cert-verifier';

// eslint-disable-next-line @typescript-eslint/naming-convention
function getOnpremAppIdentifierHeader(): {'X-App-Identifier': string} | undefined {
    const onpremAppIdentifier = import.meta.env.ONPREM_APP_IDENTIFIER;
    const onpremAppIdentifierHeader =
        onpremAppIdentifier !== undefined
            ? {
                  'X-App-Identifier': onpremAppIdentifier,
              }
            : undefined;
    return onpremAppIdentifierHeader;
}

// IPC message handler validation
//
// See https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
// eslint-disable-next-line @typescript-eslint/no-restricted-types
export function validateSenderFrame(senderFrame: Electron.WebFrameMain | null): void {
    if (senderFrame === null) {
        throw new Error('Sender frame was null');
    }
    if (import.meta.env.DEBUG && senderFrame.url.startsWith('http://localhost:')) {
        return;
    }
    if (senderFrame.url.startsWith('threemadesktop://')) {
        return;
    }
    throw new Error(
        `Security violation: Attempt to send IPC message from invalid sender frame: ${senderFrame.url}`,
    );
}

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

export async function showScreenSharingReminder(
    appBaseUrl: URL,
    text: string,
    label: string,
): Promise<electron.BrowserWindow> {
    const display = electron.screen.getPrimaryDisplay();
    const width = 512;
    const browserWindow = new electron.BrowserWindow({
        width,
        height: 2 * 40 + 2 * 8,
        resizable: false,
        frame: false,
        transparent: true,
        x: (display.bounds.width - width) / 2,
        y: 0,
        webPreferences: {
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            nodeIntegrationInSubFrames: false,
            preload: path.join(__dirname, '..', 'screenshare-preload', 'screenshare-preload.cjs'),
            webSecurity: true,
            allowRunningInsecureContent: false,
            webgl: false,
            plugins: false,
            experimentalFeatures: false,
            disableBlinkFeatures: [].join(','),
            contextIsolation: true,
            webviewTag: false,
            navigateOnDragDrop: false,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            enableWebSQL: false,
        },
    });

    return await browserWindow.loadURL(`${new URL('/screenshare.html', appBaseUrl)}`).then(() => {
        browserWindow.setAlwaysOnTop(true, 'floating');
        const details: ScreenSharingReminderDetails = {text, label};
        browserWindow.webContents.send(ScreenSharingReminderIpcCommand.SET_DETAILS, details);
        return browserWindow;
    });
}

export function mapToScreenSharingSources(
    sources: electron.DesktopCapturerSource[],
): ScreenSharingSource[] {
    return sources.map((source) => ({
        appIcon:
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            source.appIcon !== null && !source.appIcon.isEmpty()
                ? source.appIcon.toDataURL()
                : undefined,
        id: source.id,
        name: source.name,
        isScreen: source.id.startsWith('screen'),
        thumbnail: source.thumbnail.toDataURL(),
    }));
}

export async function checkOppFile(
    event: Electron.IpcMainInvokeEvent,
    oppfUrl: string,
    username: string,
    password: string,
    userAgent: string,
    log: Logger,
): Promise<u53> {
    validateSenderFrame(event.senderFrame);

    const session = getIsolatedSession('oppf-fetch', log, event.sender);
    const response = await session.fetch(oppfUrl, {
        method: 'HEAD',
        headers: {
            'authorization': `Basic ${u8aToBase64(UTF8.encode(`${username}:${password}`))}`,
            'user-agent': userAgent,
            ...getOnpremAppIdentifierHeader(),
        },
    });

    return response.status;
}

export async function getOppFile(
    event: Electron.IpcMainInvokeEvent,
    oppfUrl: string,
    username: string,
    password: string,
    userAgent: string,
    log: Logger,
): Promise<ArrayBuffer> {
    validateSenderFrame(event.senderFrame);

    const session = getIsolatedSession('oppf-fetch', log, event.sender);
    const response = await session.fetch(oppfUrl, {
        method: 'GET',
        headers: {
            'authorization': `Basic ${u8aToBase64(UTF8.encode(`${username}:${password}`))}`,
            'accept': 'application/json',
            'user-agent': userAgent,
            ...getOnpremAppIdentifierHeader(),
        },
    });

    return await response.arrayBuffer();
}

export async function checkFallbackOppFile(
    event: Electron.IpcMainInvokeEvent,
    oppfUrl: string,
    userAgent: string,
    log: Logger,
): Promise<u53> {
    validateSenderFrame(event.senderFrame);

    const session = getIsolatedSession('oppf-fallback-fetch', log, event.sender);
    const response = await session.fetch(oppfUrl, {
        method: 'HEAD',
        headers: {
            'user-agent': userAgent,
        },
    });

    return response.status;
}

export async function getFallbackOppFile(
    event: Electron.IpcMainInvokeEvent,
    oppfUrl: string,
    userAgent: string,
    log: Logger,
): Promise<ArrayBuffer> {
    validateSenderFrame(event.senderFrame);

    const session = getIsolatedSession('oppf-fallback-fetch', log, event.sender);
    const response = await session.fetch(oppfUrl, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'user-agent': userAgent,
        },
    });

    return await response.arrayBuffer();
}

function getIsolatedSession(
    partition: string,
    log: Logger,
    webContents: WebContents,
): Electron.Session {
    const session = electron.session.fromPartition(partition);
    session.setCertificateVerifyProc(
        createTlsCertificateVerifier(
            import.meta.env.TLS_CERTIFICATE_PINS?.map(({fqdn, matchMode, spkis}) => ({
                fqdn,
                matchMode,
                spkis: spkis.map(({algorithm, value}) => ({
                    algorithm,
                    value: ensureSpkiValue(base64ToU8a(value)),
                })),
            })),
            log,
            webContents,
        ),
    );

    return session;
}
