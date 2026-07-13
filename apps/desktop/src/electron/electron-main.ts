import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import {pathToFileURL, URL} from 'node:url';

import * as v from '@badrap/valita';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {base64ToU8a} from '@threema/ts-utils/base64/base64-to-u8a';
import type {u53} from '@threema/ts-utils/integer/u53';
import {ensureError} from '@threema/ts-utils/meta/ensure-error';
import {clamp} from '@threema/ts-utils/number/clamp';
import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
// eslint-disable-next-line import/no-extraneous-dependencies
import {Menu, type IpcMainEvent, type MenuItemConstructorOptions} from 'electron';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as electron from 'electron';

import type {DeleteProfileOptions, ErrorDetails, SystemInfo} from '~/common/electron-ipc';
import {ElectronIpcCommand, ScreenSharingReminderIpcCommand} from '~/common/enum';
import {extractErrorTraceback} from '~/common/error';
import {
    CONSOLE_LOGGER,
    type Logger,
    type LoggerFactory,
    TagLogger,
    TeeLogger,
} from '~/common/logging';
import {ZlibCompressor} from '~/common/node/compressor';
import {
    type ElectronSettings,
    loadElectronSettings,
    updateElectronSettings,
    DEFAULT_ELECTRON_SETTINGS,
} from '~/common/node/electron-settings';
import type {LogFileInfo, LogInfo} from '~/common/node/file-storage/log-info';
import {directoryModeInternalObjectIfPosix, fileModeInternalObjectIfPosix} from '~/common/node/fs';
import {FileLogger} from '~/common/node/logging';
import {removeOldProfiles, getLatestProfilePath} from '~/common/node/old-profiles';
import {getSafeStoragePasswordPath} from '~/common/node/safe-storage/helpers';
import {
    ensureRemoteSecretMonitorErrorType,
    type RemoteSecretErrorType,
} from '~/common/remote-secret';
import {ensureSpkiValue, type DomainCertificatePin, type i53} from '~/common/types';
import {
    assert,
    assertUnreachable,
    setAssertFailLogger,
    unreachable,
    unwrap,
} from '~/common/utils/assert';

import {
    checkFallbackOppFile,
    checkOppFile,
    getFallbackOppFile,
    getOppFile,
    getPersistentAppDataBaseDir,
    mapToScreenSharingSources,
    showScreenSharingReminder,
    validateSenderFrame,
} from './electron-utils';
import {
    checkPinsAgainstCertStore,
    type CertificateStore,
    createTlsCertificateVerifier,
} from './tls-cert-verifier';

// Exit codes
//
// Note: Keep this in sync with exit codes in `launcher` rust crate.
const EXIT_CODE_UNCAUGHT_ERROR = 7;
const EXIT_CODE_RESTART = 8;
const EXIT_CODE_DELETE_PROFILE_AND_RESTART = 9;
const EXIT_CODE_RENAME_PROFILE_AND_RESTART = 10;
const EXIT_CODE_RESTART_AND_INSTALL_UPDATE = 11;

const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_BLOCKED = 30;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_INVALID_STATE = 31;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_MISMATCH = 32;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_NOT_FOUND = 33;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_SERVER_ERROR = 34;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_TIMEOUT = 35;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_NETWORK_ERROR = 36;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_RATE_LIMIT_EXCEEDED = 37;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_INVALID_CREDENTIALS = 38;
const EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_UNKNOWN = 39;
const EXIT_CODE_RESTART_REMOTE_SECRET_SYSTEM_SUSPENSION = 40;

// Path name for user data, see
// https://www.electronjs.org/docs/latest/api/app#appgetpathname
const ELECTRON_PATH_USER_DATA = 'userData';

/**
 * Run parameters parsed from CLI arguments.
 */
const RUN_PARAMETER_BOOL_SCHEMA = v
    .string()
    .chain((bool) =>
        ['true', 'false'].includes(bool)
            ? v.ok(bool === 'true')
            : v.err(`Expected "true" or "false", but got "${bool}"`),
    );
const RUN_PARAMETER_REMOTE_SECRET_ERROR_SCHEMA = v.string().map(ensureRemoteSecretMonitorErrorType);
const RUN_PARAMETERS_SCHEMA = v.object({
    'profile': v
        .string()
        .optional(() => 'default')
        .chain((s) => {
            if (s.match(/^[0-9a-z]+$/u) !== null) {
                return v.ok(s);
            }
            return v.err('Profile name is only allowed to contain lower-case letters or numbers');
        }),
    'remote-secret-error': RUN_PARAMETER_REMOTE_SECRET_ERROR_SCHEMA.optional(),
    'remote-secret-suspend-restart': RUN_PARAMETER_BOOL_SCHEMA.optional(),
    'single-instance-lock': RUN_PARAMETER_BOOL_SCHEMA.optional(),
    'test-data': v.string().optional(),
});
type RunParameters = Readonly<v.Infer<typeof RUN_PARAMETERS_SCHEMA>>;

/**
 * Run parameter documentation.
 */
const RUN_PARAMETERS_DOCS: {readonly [K in keyof RunParameters]: string} = {
    'profile':
        '<session-profile-name> – The name of the profile to use. Only lower-case letters and numbers are allowed. "default" by default.',
    'remote-secret-error':
        '<error-type> – Display a specific remote secret error type at login. Internal option, not useful to change manually.',
    'single-instance-lock':
        '<true|false> – Prevent running multiple instances of Threema Desktop at the same time (default: "true"). Development option, disable at your own risk!',
    'test-data': '<path> – Path to test data including a profile. Used for e2e testing.',
};

const ABOUT_PANEL_OPTIONS: electron.AboutPanelOptionsOptions = {
    applicationName: import.meta.env.APP_NAME,
    applicationVersion: `${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_FLAVOR})`,
    version:
        `v${import.meta.env.BUILD_VERSION}` === import.meta.env.GIT_REVISION
            ? ''
            : import.meta.env.GIT_REVISION,
    copyright: '© Threema AG – Released under the AGPL-3.0 license',
    website: 'https://threema.ch/',
    iconPath: import.meta.env.DEBUG
        ? path.join(
              __dirname,
              '..',
              '..',
              '..',
              'src',
              'public',
              'res',
              'icons',
              import.meta.env.BUILD_FLAVOR,
              'icon-512.png',
          )
        : path.join(process.resourcesPath, 'icon-512.png'), // See dist-electron.js → extraResource
};

const APP_NAME_AND_VERSION = (() => {
    let result = `${ABOUT_PANEL_OPTIONS.applicationName} ${ABOUT_PANEL_OPTIONS.applicationVersion}`;
    if (ABOUT_PANEL_OPTIONS.version !== '') {
        result += ` (${ABOUT_PANEL_OPTIONS.version})`;
    }
    return result;
})();

// Start with the console logger, will be replaced upon initialisation.
let log: Logger = CONSOLE_LOGGER;

/**
 * Print CLI usage and exit.
 */
function showUsageAndExit(entrypoint: string, error?: unknown): never {
    log.error(
        `${APP_NAME_AND_VERSION}\n\n`,
        `Usage: ${entrypoint}\n`,
        ...Object.entries(RUN_PARAMETERS_DOCS).map(
            ([option, description]) => `--threema-${option}=${description}\n`,
        ),
        `\nNote: Electron parameters are supported as well:`,
        `\nhttps://www.electronjs.org/docs/latest/api/command-line-switches/`,
    );
    if (error !== undefined) {
        log.error(error);
        process.exit(1);
    } else {
        process.exit(0);
    }
}

function handleCriticalError(
    source: 'main' | 'renderer or worker',
    details: ErrorDetails,
    webContents?: electron.WebContents,
): void {
    // Determine text content of the message box (message plus detail, if available)
    let fullErrorSummary = `𝗘𝗿𝗿𝗼𝗿 𝗺𝗲𝘀𝘀𝗮𝗴𝗲:\n\n${details.message}\n`;
    if (details.location !== undefined) {
        fullErrorSummary += `\n𝗟𝗼𝗰𝗮𝘁𝗶𝗼𝗻:\n\n${details.location.filename}:${details.location.line}\n`;
    }
    if (details.stacktrace !== undefined) {
        fullErrorSummary += `\n𝗦𝘁𝗮𝗰𝗸 𝘁𝗿𝗮𝗰𝗲:\n\n${details.stacktrace}\n`;
    }

    const title = `CRITICAL ERROR in ${source} process`;
    log.error(`${title}\n\n${fullErrorSummary}`);

    // Determine buttons to show:
    //
    // - Show reload button if window is open and the error source is not the main thread
    // - Always show quit button
    // - Show debug button if this is a debug build
    const buttons = [];
    let reloadId: u53 | undefined;
    let debugId: u53 | undefined;
    if (webContents !== undefined && source !== 'main') {
        buttons.push('Reload');
        reloadId = 0;
    }
    buttons.push('Quit');
    if (import.meta.env.DEBUG) {
        buttons.push('Debug');
        debugId = buttons.length - 1;
    }

    // Show dialog box
    electron.dialog
        .showMessageBox({
            title,
            message: `A critical error occurred in ${source}. Please make sure logging is enabled (Settings > About Threema > Logging), and report this error to Threema Support (Settings > About Threema > Send Logs to Support).\n\n${fullErrorSummary}`,
            type: 'error',
            buttons,
            defaultId: 0,
        })
        .then((result) => {
            if (debugId !== undefined && result.response === debugId) {
                log.info('Carry on for debugging purposes');
                webContents?.openDevTools();
            } else if (reloadId !== undefined && result.response === reloadId) {
                log.info('Reloading window');
                webContents?.reloadIgnoringCache();
            } else {
                electron.app.exit(EXIT_CODE_UNCAUGHT_ERROR);
            }
        })
        .catch((error: unknown) => log.error(`Dialog promise unsuccessful: ${error}`));
}

function buildElectronMenu(): electron.Menu {
    const isMac = process.platform === 'darwin';

    /**
     * Remove `undefined` values from the specified menu `entries`.
     */
    function removeUndefined(
        entries: (MenuItemConstructorOptions | undefined)[],
    ): MenuItemConstructorOptions[] {
        return entries.filter((entry) => entry !== undefined);
    }

    // Menu: macOS-only app menu
    const macAppMenu: MenuItemConstructorOptions = {
        role: 'appMenu',
        submenu: [
            {role: 'about'},
            {type: 'separator'},
            {role: 'services'},
            {type: 'separator'},
            {role: 'hide'},
            {role: 'hideOthers'},
            {role: 'unhide'},
            {type: 'separator'},
            {role: 'quit'},
        ],
    };

    // Menu: File
    const fileMenu: MenuItemConstructorOptions = {
        role: 'fileMenu',
        submenu: [
            {
                role: `quit`,
            },
        ],
    };

    // Menu: Edit
    const editMenu: MenuItemConstructorOptions = {
        role: 'editMenu',
        submenu: [
            {role: 'undo'},
            {role: 'redo'},
            {type: 'separator'},
            {role: 'cut'},
            {role: 'copy'},
            {role: 'paste'},
            {role: 'delete'},
            {type: 'separator'},
            {role: 'selectAll'},
        ],
    };

    // Menu: macOS-only 'window' menu (for cmd+w/m shortcuts)
    const windowMenu: MenuItemConstructorOptions = {
        role: 'windowMenu',
        submenu: [{role: 'minimize'}, {role: 'close'}],
    };

    // Menu: View
    const viewMenu: MenuItemConstructorOptions = {
        role: 'viewMenu',
        submenu: removeUndefined([
            {role: 'reload'},
            {role: 'forceReload'},
            import.meta.env.DEBUG ? {role: 'toggleDevTools'} : undefined,
            {type: 'separator'},
            {role: 'resetZoom'},
            {role: 'zoomIn'},
            {role: 'zoomOut'},
            {type: 'separator'},
            {role: 'togglefullscreen'},
        ]),
    };

    // Menu: Help (Note: Not shown on macOS)
    const helpMenu: MenuItemConstructorOptions = {
        role: 'help',
        submenu: [{label: 'About', click: () => electron.app.showAboutPanel()}],
    };

    return electron.Menu.buildFromTemplate(
        removeUndefined([
            isMac ? macAppMenu : undefined,
            fileMenu,
            editMenu,
            viewMenu,
            isMac ? windowMenu : undefined,
            isMac ? undefined : helpMenu,
        ]),
    );
}

function getMainAppLogPath(appPath: string): string {
    return path.join(appPath, ...import.meta.env.LOG_PATH.MAIN_AND_APP);
}

function getBackendWorkerLogPath(appPath: string): string {
    return path.join(appPath, ...import.meta.env.LOG_PATH.BACKEND_WORKER);
}

function clearLogs(appPath: string): void {
    const mainAppLogPath = getMainAppLogPath(appPath);
    if (fs.existsSync(mainAppLogPath)) {
        try {
            fs.truncateSync(mainAppLogPath, 0);
        } catch (error) {
            log.error(`Failed to truncate file ${mainAppLogPath}: ${ensureError(error).message}`);
        }
    }
    const logBackendPath = getBackendWorkerLogPath(appPath);
    if (fs.existsSync(logBackendPath)) {
        try {
            fs.truncateSync(logBackendPath, 0);
        } catch (error) {
            log.error(`Failed to truncate file ${logBackendPath}: ${ensureError(error).message}`);
        }
    }
}

function generateLogFileInfo(type: 'app' | 'bw', appPath: string): LogFileInfo {
    let sizeInBytes = 0;
    let logPath: string;
    switch (type) {
        case 'app':
            logPath = getMainAppLogPath(appPath);
            break;
        case 'bw':
            logPath = getBackendWorkerLogPath(appPath);
            break;
        default:
            unreachable(type);
    }
    if (fs.existsSync(logPath)) {
        sizeInBytes = fs.statSync(logPath).size;
    }
    return {sizeInBytes, path: logPath};
}

async function loadCompressedLogBytes(filePath: string): Promise<ReadonlyUint8Array | undefined> {
    const compressor = new ZlibCompressor();
    try {
        const bytes = await fs.promises.readFile(filePath);
        return await compressor.compress('gzip', bytes);
    } catch {
        return undefined;
    }
}

interface MainInit {
    readonly parameters: RunParameters;
    readonly appPath: string;
    readonly fileLogger: FileLogger | undefined;
    readonly log: Logger;
    readonly appBaseUrl: URL;
    readonly electronSettings: ElectronSettings;
}

// Initialise the Electron process. Nothing in here (besides `log`) is allowed to modify global
// state!
async function init(): Promise<MainInit> {
    /**
     * Parses the CLI arguments into options:
     */
    function parseParameters(argv: readonly string[]): RunParameters {
        // Note: The number of entries in argv depends on whether the application is packaged or not.
        //       See https://github.com/electron/electron/issues/4690 for details.
        const offset = electron.app.isPackaged ? 1 : 2;
        const entrypoint = argv.slice(0, offset).join(' ');
        const options = argv.slice(offset);
        const unverifiedParameters = options
            .map<[key?: string, value?: string]>((raw) => {
                if (raw === '-h' || raw === '--help') {
                    showUsageAndExit(entrypoint);
                }
                if (raw === '--version') {
                    log.error(APP_NAME_AND_VERSION);
                    process.exit(0);
                }

                // Let Electron handle any non-Threema-specific parameters
                if (!raw.startsWith('--threema-')) {
                    return [undefined, undefined];
                }

                // Strip the `--threema-` prefix and split into option name and value
                const [option, value] = raw.substring(10).split('=', 2);
                return [option, value];
            })
            .filter(([key]) => key !== undefined);
        try {
            return RUN_PARAMETERS_SCHEMA.parse(Object.fromEntries(unverifiedParameters));
        } catch (error) {
            const errorText = error instanceof v.ValitaError ? error.message : error;
            return showUsageAndExit(entrypoint, errorText);
        }
    }

    // Parse CLI arguments into run parameters
    const parameters = parseParameters(process.argv);

    // Use subdirectory for user data (where Electron stores all of its data)
    // depending on build variant and profile.
    const appPath = path.join(
        ...getPersistentAppDataBaseDir(),
        `${import.meta.env.BUILD_FLAVOR}-${parameters.profile}`,
    );
    if (!fs.existsSync(appPath)) {
        log.info(`Creating app data directory at ${appPath}`);
        fs.mkdirSync(appPath, {recursive: true, ...directoryModeInternalObjectIfPosix()});
    }
    // Note: This call needs to be done as early as possible.
    electron.app.setPath(ELECTRON_PATH_USER_DATA, appPath);

    // Load electron settings from JSON file
    const electronSettings = loadElectronSettings(appPath, {
        process: 'electron',
        log,
        profile: parameters.profile,
    });

    // Initialise logging
    let logging: LoggerFactory;
    let fileLogger: FileLogger | undefined;
    const logFilePath = getMainAppLogPath(appPath);
    if (electronSettings.logging.enabled) {
        try {
            fs.mkdirSync(path.dirname(logFilePath), {
                recursive: true,
                ...directoryModeInternalObjectIfPosix(),
            });
            fileLogger = await FileLogger.create(logFilePath);
        } catch (error) {
            CONSOLE_LOGGER.error(`Unable to create file logger (path: '${logFilePath}'):`, error);
        }
    }

    // Create the logging factory
    const tagLogging = TagLogger.unstyled(CONSOLE_LOGGER, 'main');
    if (fileLogger === undefined) {
        logging = tagLogging;
    } else {
        logging = TeeLogger.factory([tagLogging, TagLogger.unstyled(fileLogger, 'main')]);
    }
    {
        const assertFailLogger = logging.logger('assert');
        setAssertFailLogger((error) => assertFailLogger.error(extractErrorTraceback(error)));
    }
    // eslint-disable-next-line require-atomic-updates
    log = logging.logger('main');

    // Initial log entries
    const appName = ABOUT_PANEL_OPTIONS.applicationName ?? 'Threema';
    log.info(`
Starting ${appName} ${ABOUT_PANEL_OPTIONS.applicationVersion}
Version information:
  Application: ${ABOUT_PANEL_OPTIONS.applicationVersion} (${ABOUT_PANEL_OPTIONS.version})
  NodeJS: ${process.version}
  NODE_MODULE_VERSION: ${process.versions.modules}`);
    log.info(`File system storage path: ${appPath}`);

    // Determine URL
    let appBaseUrl: URL;
    if (!import.meta.env.DEBUG) {
        appBaseUrl = new URL('threemadesktop://app/');
    } else {
        appBaseUrl = new URL(`http://localhost:${import.meta.env.DEV_SERVER_PORT}/`);
    }

    // Done
    return {
        parameters,
        appPath,
        fileLogger,
        log,
        appBaseUrl,
        electronSettings,
    };
}

// Run the Electron process after initialisation. This drives the state of the app. Keep this block
// to a bare minimum and move stateless functions out of it, so that state is easy to track!
function main(
    {parameters, appPath, fileLogger, appBaseUrl, electronSettings}: MainInit,
    signal: {readonly start: boolean},
): void {
    function isValidAppUrl(url?: string): boolean {
        return url?.replace(/#.*/u, '') === `${appBaseUrl}`;
    }

    /**
     * Quit immediately with the appropriate exit code, indicating to the launcher binary that the
     * application should be restarted.
     *
     * Note: In development mode, when running without the launcher binary, the application will
     * exit, but it will not be restarted and the profile won't be deleted. To test logic depending
     * on a restart, create a dist build (npm run dist:<flavor>) and run the launcher binary (Linux)
     * or app bundle (macOS) from there.
     */
    function restartApplication(
        mode:
            | 'delete-profile-and-restart'
            | `remote-secret-error-${RemoteSecretErrorType}`
            | 'remote-secret-system-suspension'
            | 'rename-profile-and-restart'
            | 'restart'
            | 'restart-and-install-update',
    ): void {
        switch (mode) {
            case 'delete-profile-and-restart': {
                log.info(`Requesting profile deletion and app restart`);
                return electron.app.exit(EXIT_CODE_DELETE_PROFILE_AND_RESTART);
            }

            case 'remote-secret-error-blocked':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_BLOCKED);

            case 'remote-secret-error-invalid-state':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_INVALID_STATE);

            case 'remote-secret-error-mismatch':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_MISMATCH);

            case 'remote-secret-error-not-found':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_NOT_FOUND);

            case 'remote-secret-error-server-error':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_SERVER_ERROR);

            case 'remote-secret-error-timeout':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_TIMEOUT);

            case 'remote-secret-error-network-error':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_NETWORK_ERROR);

            case 'remote-secret-error-rate-limit-exceeded':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_RATE_LIMIT_EXCEEDED);

            case 'remote-secret-error-invalid-credentials':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_INVALID_CREDENTIALS);

            case 'remote-secret-system-suspension':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_SYSTEM_SUSPENSION);

            case 'remote-secret-error-unknown':
                log.info(`Requesting app restart due to remote secret error: ${mode}`);
                return electron.app.exit(EXIT_CODE_RESTART_REMOTE_SECRET_ERROR_UNKNOWN);

            case 'rename-profile-and-restart': {
                log.info(`Requesting profile renaming and app restart`);
                return electron.app.exit(EXIT_CODE_RENAME_PROFILE_AND_RESTART);
            }

            case 'restart': {
                log.info(`Requesting app restart`);
                return electron.app.exit(EXIT_CODE_RESTART);
            }

            case 'restart-and-install-update':
                log.info(`Requesting app restart and update install`);
                return electron.app.exit(EXIT_CODE_RESTART_AND_INSTALL_UPDATE);

            default:
                return unreachable(mode);
        }
    }

    // Main app window.
    let window: electron.BrowserWindow | undefined;
    let screenSharingReminderWindow: electron.BrowserWindow | undefined;
    let webRtcInternalsWindow: electron.BrowserWindow | undefined;

    function start(): void {
        // Ignore if window is still open
        if (window !== undefined) {
            // Show window again if it was hidden
            window.show();
            log.debug('Already started, ignoring request to start');
            return;
        }

        log.info('Starting');

        // Set app name
        electron.app.setName(import.meta.env.APP_NAME);

        // Configure DNS
        electron.app.configureHostResolver({
            // Disable built-in DNS resolver to avoid communication with Google / CloudFlare DNS
            enableBuiltInResolver: false,
            // Prefer DoH if supported by system nameserver
            secureDnsMode: 'automatic',
        });

        const isSafeToRestartApp = new ResolvablePromise<void>({uncaught: 'discard'});

        // Usually the app should restart immediately if asked to, just in the case that the app is
        // recovering from invalid SPKI pins we should make sure to switch this boolean so we have
        // time to update the onprem provisioning file and update the public key pins.
        let isSafeToRestartImmediately = true;

        // Set Electron menu
        electron.Menu.setApplicationMenu(buildElectronMenu());
        electron.app.setAboutPanelOptions(ABOUT_PANEL_OPTIONS);

        // Generate error response (HTTP 400) for custom protocol handlers
        function errorResponse(url: string, message: string): Response {
            log.warn(`Request to "${url}" failed: ${message}`);
            return new Response(message, {status: 400});
        }

        // Handle requests to custom threemadesktop:// protocol
        electron.protocol.handle(
            'threemadesktop',
            async (req: GlobalRequest): Promise<GlobalResponse> => {
                const {host, pathname} = new URL(req.url);

                log.debug(`-> ${req.method.toUpperCase()} ${req.url}`);

                if (host !== 'app') {
                    return errorResponse(
                        req.url,
                        'Not allowed to access files from a host other than "app"',
                    );
                }

                if (!pathname.startsWith('/')) {
                    return errorResponse(req.url, 'Pathname does not start with a slash');
                }

                // On requests to `threemadesktop://app/`, load application entrypoint
                if (pathname === '/') {
                    try {
                        return await electron.net.fetch(
                            pathToFileURL(
                                path.join(__dirname, '..', 'app', 'index.html'),
                            ).toString(),
                        );
                    } catch (error) {
                        log.error(`Loading application entrypoint failed: ${error}`);
                        throw error;
                    }
                }

                // All other requests are treated as relative to the application directory
                const pathToServe = path.resolve(__dirname, '..', 'app', pathname.slice(1));
                const relativePath = path.relative(__dirname, pathToServe);
                const isSafe =
                    relativePath.startsWith(`..${path.sep}app${path.sep}`) &&
                    !path.isAbsolute(relativePath);
                if (isSafe) {
                    try {
                        return await electron.net.fetch(pathToFileURL(pathToServe).toString());
                    } catch {
                        return errorResponse(req.url, 'Loading file path failed');
                    }
                }

                return errorResponse(req.url, 'Disallowed file access');
            },
        );

        // Set up IPC message handlers
        electron.ipcMain
            .on(ElectronIpcCommand.GET_LATEST_PROFILE_PATH, (event) => {
                validateSenderFrame(event.senderFrame);
                event.returnValue = getLatestProfilePath(appPath, parameters.profile, log);
            })
            .on(ElectronIpcCommand.REMOVE_OLD_PROFILES, (event) => {
                validateSenderFrame(event.senderFrame);
                removeOldProfiles(appPath, parameters.profile, log);
            })
            .on(
                ElectronIpcCommand.ERROR,
                (event: electron.IpcMainEvent, errorDetails: ErrorDetails) => {
                    validateSenderFrame(event.senderFrame);
                    // Handle error from renderer process
                    handleCriticalError('renderer or worker', errorDetails, window?.webContents);
                },
            )
            .on(ElectronIpcCommand.GET_APP_PATH, (event: electron.IpcMainEvent) => {
                validateSenderFrame(event.senderFrame);
                event.returnValue = electron.app.getPath(ELECTRON_PATH_USER_DATA);
            })
            .on(
                ElectronIpcCommand.DELETE_PROFILE_AND_RESTART,
                (event: electron.IpcMainEvent, options: DeleteProfileOptions) => {
                    validateSenderFrame(event.senderFrame);
                    restartApplication(
                        options.createBackup
                            ? 'rename-profile-and-restart'
                            : 'delete-profile-and-restart',
                    );
                },
            )
            .on(ElectronIpcCommand.RESTART_APP, (event: electron.IpcMainEvent) => {
                validateSenderFrame(event.senderFrame);
                restartApplication('restart');
            })
            .on(
                ElectronIpcCommand.RESTART_APP_AND_INSTALL_UPDATE,
                (event: electron.IpcMainEvent) => {
                    validateSenderFrame(event.senderFrame);
                    restartApplication('restart-and-install-update');
                },
            )
            .on(ElectronIpcCommand.CLOSE_APP, (event: electron.IpcMainEvent) => {
                validateSenderFrame(event.senderFrame);
                electron.app.quit();
            })
            .on(
                ElectronIpcCommand.UPDATE_APP_BADGE,
                (event: electron.IpcMainEvent, totalUnreadMessageCount: u53) => {
                    validateSenderFrame(event.senderFrame);
                    // Set the badge count on supported systems (currently macOS and some Linux
                    // versions).
                    //
                    // Note: macOS also supports an empty red dot instead of a number by passing
                    //       `undefined` to `.setBadgeCount`. This is not currently implemented by
                    //       our IPC API, but could be added if desired.
                    //
                    // For more details, see the Electron docs:
                    // https://www.electronjs.org/docs/latest/api/app#appsetbadgecountcount-linux-macos
                    electron.app.setBadgeCount(totalUnreadMessageCount);
                },
            )
            .on(
                ElectronIpcCommand.REMOTE_SECRET_ERROR_RESTART_APP,
                (event: electron.IpcMainEvent, errorType: RemoteSecretErrorType) => {
                    validateSenderFrame(event.senderFrame);
                    restartApplication(`remote-secret-error-${errorType}`);
                },
            )
            .on(
                ElectronIpcCommand.REMOTE_SECRET_SYSTEM_SUSPENSION_RESTART_APP,
                (event: electron.IpcMainEvent) => {
                    validateSenderFrame(event.senderFrame);
                    restartApplication('remote-secret-system-suspension');
                },
            )
            .on(ElectronIpcCommand.GET_REMOTE_SECRET_ERROR_LAUNCH_PARAMETER, (event) => {
                validateSenderFrame(event.senderFrame);
                event.returnValue = parameters['remote-secret-error'];
            })
            .on(
                ElectronIpcCommand.GET_REMOTE_SECRET_SYSTEM_SUSPENSION_LAUNCH_PARAMETER,
                (event) => {
                    validateSenderFrame(event.senderFrame);
                    event.returnValue = parameters['remote-secret-suspend-restart'] ?? false;
                },
            )
            .on(
                ElectronIpcCommand.SCREEN_SHARING_SHOW_REMINDER,
                (event: electron.IpcMainEvent, text: string, label: string) => {
                    validateSenderFrame(event.senderFrame);

                    // Just to be sure, close any other reminder floating window
                    if (screenSharingReminderWindow !== undefined) {
                        screenSharingReminderWindow.close();
                        screenSharingReminderWindow = undefined;
                    }

                    showScreenSharingReminder(appBaseUrl, text, label)
                        .then((win) => {
                            screenSharingReminderWindow = win;
                        })
                        .catch(() => {
                            screenSharingReminderWindow = undefined;
                        });
                },
            )
            .on(
                ElectronIpcCommand.SCREEN_SHARING_CLOSE_REMINDER,
                (event: electron.IpcMainEvent) => {
                    validateSenderFrame(event.senderFrame);
                    screenSharingReminderWindow?.close();
                    screenSharingReminderWindow = undefined;
                },
            )
            .on(ElectronIpcCommand.INVALID_CERTIFICATE_PINS, (event: electron.IpcMainEvent) => {
                validateSenderFrame(event.senderFrame);
                isSafeToRestartImmediately = false;
                window?.webContents.send(ElectronIpcCommand.ON_FALLBACK_OPPF);
            })
            .on(ElectronIpcCommand.OPEN_WEBRTC_INTERNALS, (event: electron.IpcMainEvent) => {
                validateSenderFrame(event.senderFrame);

                // If the window is already open, just focus it
                if (webRtcInternalsWindow !== undefined) {
                    webRtcInternalsWindow.focus();
                    return;
                }

                webRtcInternalsWindow = new electron.BrowserWindow({
                    title: 'WebRTC Internals',
                });
                webRtcInternalsWindow.on('closed', () => {
                    webRtcInternalsWindow = undefined;
                });
                webRtcInternalsWindow
                    .loadURL('chrome://webrtc-internals')
                    .catch((error: unknown) => {
                        log.error(`Could not open WebRTC internals window: ${error}`);
                    });
            })

            // Screen Sharing Reminder IPC
            .on(
                ScreenSharingReminderIpcCommand.STOP_SCREEN_SHARING,
                (event: electron.IpcMainEvent) => {
                    validateSenderFrame(event.senderFrame);
                    screenSharingReminderWindow?.close();
                    screenSharingReminderWindow = undefined;
                    window?.webContents.send(ElectronIpcCommand.SCREEN_SHARING_STOP);
                },
            )
            .on(
                ScreenSharingReminderIpcCommand.HIDE_SCREEN_SHARING_REMINDER,
                (event: electron.IpcMainEvent) => {
                    validateSenderFrame(event.senderFrame);
                    screenSharingReminderWindow?.hide();
                },
            );

        electron.ipcMain.handle(ElectronIpcCommand.GET_TEST_DATA, (event) => {
            validateSenderFrame(event.senderFrame);
            const testDataFileName = parameters['test-data'];
            try {
                return testDataFileName !== undefined
                    ? fs.readFileSync(testDataFileName, 'utf8')
                    : undefined;
            } catch {
                throw new Error(`Failed to load test data file: ${testDataFileName}`);
            }
        });
        electron.ipcMain.handle(ElectronIpcCommand.LOAD_USER_PASSWORD, (event) => {
            validateSenderFrame(event.senderFrame);

            const safeStoragePasswordPath = getSafeStoragePasswordPath(appPath);
            if (!fs.existsSync(safeStoragePasswordPath)) {
                log.info('Password file not found, loading password skipped.');
                return undefined;
            }

            if (electron.safeStorage.isEncryptionAvailable()) {
                try {
                    const encryptedPassword = fs.readFileSync(safeStoragePasswordPath);
                    return electron.safeStorage.decryptString(encryptedPassword);
                } catch {
                    log.warn(`Failed to read or decrypt the password.`);
                }
            } else {
                log.warn(
                    'Electron safeStorage is not available (no password manager?), loading password skipped.',
                );
            }
            return undefined;
        });
        electron.ipcMain.handle(
            ElectronIpcCommand.STORE_USER_PASSWORD,
            (event, password: string) => {
                validateSenderFrame(event.senderFrame);

                if (electron.safeStorage.isEncryptionAvailable()) {
                    const safeStoragePasswordPath = getSafeStoragePasswordPath(appPath);
                    try {
                        const encryptedPassword = electron.safeStorage.encryptString(password);
                        const options = {...fileModeInternalObjectIfPosix()};
                        fs.writeFileSync(safeStoragePasswordPath, encryptedPassword, options);
                        return true;
                    } catch {
                        log.error(`Failed to store or encrypt the password.`);
                    }
                } else {
                    log.warn(
                        'Electron safeStorage is not available (no password manager?), storing password skipped.',
                    );
                }
                return false;
            },
        );
        electron.ipcMain.handle(
            ElectronIpcCommand.GET_SYSTEM_INFO,
            // eslint-disable-next-line @typescript-eslint/require-await
            async (event): Promise<SystemInfo> => {
                validateSenderFrame(event.senderFrame);
                let operatingSystem: SystemInfo['os'];
                switch (process.platform) {
                    case 'win32':
                        operatingSystem = 'windows';
                        break;
                    case 'darwin':
                        operatingSystem = 'macos';
                        break;
                    case 'linux':
                        operatingSystem = 'linux';
                        break;
                    default:
                        operatingSystem = 'other';
                        break;
                }
                return {
                    os: operatingSystem,
                    arch: process.arch,
                    // TODO(DESK-1122): Improve this
                    locale: electron.app.getLocale(),
                    isSafeStorageAvailable: electron.safeStorage.isEncryptionAvailable(),
                };
            },
        );
        electron.ipcMain.handle(
            ElectronIpcCommand.LOG_TO_FILE,
            (event, level: 'trace' | 'debug' | 'info' | 'warn' | 'error', data: string) => {
                validateSenderFrame(event.senderFrame);
                // @ts-expect-error: TODO(DESK-684): Don't access private properties
                fileLogger?._write(level, data);
            },
        );
        electron.ipcMain.handle(ElectronIpcCommand.BEFORE_RESTART, async (event) => {
            validateSenderFrame(event.senderFrame);
            if (!isSafeToRestartImmediately) {
                log.debug('Awaiting all pre-restart tasks to complete before restart');
                await Promise.race([TIMER.sleep(30_000), isSafeToRestartApp]);
            }
        });
        electron.ipcMain.handle(ElectronIpcCommand.SIGNAL_RESTART_READY, (event) => {
            validateSenderFrame(event.senderFrame);
            log.debug('Completed pre-restart tasks, signaling restart readiness');
            isSafeToRestartApp.resolve();
        });
        electron.ipcMain.handle(ElectronIpcCommand.IS_FILE_LOGGING_ENABLED, (event) => {
            validateSenderFrame(event.senderFrame);
            return fileLogger !== undefined;
        });
        electron.ipcMain.on(
            ElectronIpcCommand.SET_FILE_LOGGING_ENABLED_AND_RESTART,
            (event, enabled: boolean) => {
                validateSenderFrame(event.senderFrame);
                if (!enabled) {
                    clearLogs(appPath);
                }
                // In the rare (if not impossible) case that window is undefined, we just default to the standard window size
                updateElectronSettings(
                    {
                        window: {
                            width: window?.getSize()[0] ?? DEFAULT_ELECTRON_SETTINGS.window.width,
                            height: window?.getSize()[1] ?? DEFAULT_ELECTRON_SETTINGS.window.height,
                            offsetX: window?.getPosition()[0],
                            offsetY: window?.getPosition()[1],
                        },
                        logging: {enabled},
                    },
                    appPath,
                    log,
                );
                restartApplication('restart');
            },
        );

        electron.ipcMain.handle(ElectronIpcCommand.CLEAR_LOG_FILES, (event) => {
            validateSenderFrame(event.senderFrame);
            clearLogs(appPath);
        });

        electron.ipcMain.handle(ElectronIpcCommand.GET_SPELLCHECK, (event) => {
            validateSenderFrame(event.senderFrame);
            if (process.platform === 'darwin') {
                return session.spellCheckerEnabled;
            }
            return undefined;
        });

        electron.ipcMain.on(ElectronIpcCommand.SET_SPELLCHECK, (event, enable: boolean) => {
            validateSenderFrame(event.senderFrame);
            // TODO(DESK-1458) Enable spellcheck in other systems as well
            if (process.platform === 'darwin') {
                updateElectronSettings({spellCheck: {enabled: enable}}, appPath, log);
                restartApplication('restart');
                return;
            }
            log.warn(
                'Trying to set the spellcheck on a non-darwin platform. This is not implemented yet',
            );
        });

        electron.ipcMain.handle(ElectronIpcCommand.GET_LOG_INFORMATION, (event) => {
            validateSenderFrame(event.senderFrame);
            const logInfo: LogInfo = {
                logFiles: {
                    mainApplication: generateLogFileInfo('app', appPath),
                    backendWorker: generateLogFileInfo('bw', appPath),
                },
            };
            return logInfo;
        });

        electron.ipcMain.handle(ElectronIpcCommand.GET_GZIPPED_LOG_FILE, async (event) => {
            validateSenderFrame(event.senderFrame);
            try {
                const [app, bw] = await Promise.all([
                    loadCompressedLogBytes(getMainAppLogPath(appPath)),
                    loadCompressedLogBytes(getBackendWorkerLogPath(appPath)),
                ]);
                return {app, bw};
            } catch (error) {
                throw new Error(
                    `Failed to load or compress the log files: ${ensureError(error).message}`,
                );
            }
        });

        electron.ipcMain.handle(
            ElectronIpcCommand.UPDATE_PUBLIC_KEY_PINS,
            (event, publicKeyPins: DomainCertificatePin[]) => {
                validateSenderFrame(event.senderFrame);
                // Sanity check because we do not want non-onprem builds to tamper with the pins.
                assert(import.meta.env.BUILD_ENVIRONMENT === 'onprem');
                // Update the verifier proc so future connections to new (not-yet-cached)
                // hosts are validated against the new pins.
                session.setCertificateVerifyProc(
                    createTlsCertificateVerifier(publicKeyPins, log, event.sender, certStore),
                );

                // Chromium caches TLS cert verification results per {hostname, certificate},
                // so the verifier proc above will NOT be called again for hosts already seen
                // in this session. We therefore eagerly re-validate every stored certificate
                // against the new pins here.
                //
                // We only do this when pins are non-empty and when the cert store already
                // has entries (i.e. at least one connection to a pinned host has been made).
                //
                // See https://github.com/electron/electron/issues/41448
                if (publicKeyPins.length > 0 && certStore.size > 0) {
                    if (!checkPinsAgainstCertStore(publicKeyPins, certStore, log)) {
                        electron.ipcMain.emit(ElectronIpcCommand.INVALID_CERTIFICATE_PINS, {
                            senderFrame: {
                                url: event.sender.getURL(),
                            },
                        });
                    }
                }

                blockRequests = false;
                isSafeToRestartImmediately = true;

                return true;
            },
        );
        electron.ipcMain.handle(ElectronIpcCommand.TRIGGER_INVALID_CERTIFICATE_PINS, (event) => {
            validateSenderFrame(event.senderFrame);
            assert(
                import.meta.env.BUILD_MODE !== 'production',
                'TRIGGER_INVALID_CERTIFICATE_PINS is not available in production builds',
            );
            electron.ipcMain.emit(ElectronIpcCommand.INVALID_CERTIFICATE_PINS, {
                senderFrame: {
                    url: event.sender.getURL(),
                },
            });
        });

        electron.ipcMain.handle(
            ElectronIpcCommand.GET_OPP_FILE,
            async (event, oppfUrl: string, username: string, password: string, userAgent: string) =>
                await getOppFile(event, oppfUrl, username, password, userAgent, log),
        );

        electron.ipcMain.handle(
            ElectronIpcCommand.CHECK_OPP_FILE,
            async (event, oppfUrl: string, username: string, password: string, userAgent: string) =>
                await checkOppFile(event, oppfUrl, username, password, userAgent, log),
        );

        electron.ipcMain.handle(
            ElectronIpcCommand.CHECK_FALLBACK_OPP_FILE,
            async (event, oppfUrl: string, userAgent: string) =>
                await checkFallbackOppFile(event, oppfUrl, userAgent, log),
        );

        electron.ipcMain.handle(
            ElectronIpcCommand.GET_FALLBACK_OPP_FILE,
            async (event, oppfUrl: string, userAgent: string) =>
                await getFallbackOppFile(event, oppfUrl, userAgent, log),
        );

        const session = electron.session.defaultSession;

        // For onprem we have to block all requests until we downloaded the OPP file in an isolated
        // session: https://github.com/electron/electron/issues/41448
        let blockRequests = import.meta.env.BUILD_ENVIRONMENT === 'onprem';

        // Shared store of the most recently seen certificate per hostname. The
        // verifier populates this so that UPDATE_PUBLIC_KEY_PINS can eagerly
        // re-validate already-cached hostnames when pins change at runtime.
        // Only used in onprem builds.
        const certStore: CertificateStore = new Map();

        session.webRequest.onBeforeRequest((details, callback) => {
            const url = new URL(details.url);

            if (
                !blockRequests ||
                url.protocol === 'devtools:' ||
                url.protocol === 'threemadesktop:' ||
                url.hostname === 'localhost' ||
                url.hostname === '127.0.0.1' ||
                url.hostname === '::1'
            ) {
                return callback({cancel: false});
            }

            // Block everything else.
            log.warn(`Request to ${url} blocked`);
            return callback({cancel: true});
        });

        const isMacOrWindows = process.platform === 'win32' || process.platform === 'darwin';
        const workAreaSize = electron.screen.getPrimaryDisplay().workAreaSize;
        const width = Math.min(electronSettings.window.width, workAreaSize.width);
        const height = Math.min(electronSettings.window.height, workAreaSize.height);
        let x: i53 | undefined;
        if (isMacOrWindows && electronSettings.window.offsetX !== undefined) {
            x = clamp(electronSettings.window.offsetX, {min: 0, max: workAreaSize.width - width});
        }
        let y: i53 | undefined;
        if (isMacOrWindows && electronSettings.window.offsetY !== undefined) {
            y = clamp(electronSettings.window.offsetY, {min: 0, max: workAreaSize.height - height});
        }

        window = new electron.BrowserWindow({
            title: import.meta.env.APP_NAME,
            // Remove the default system titlebar on macOS.
            ...(process.platform === 'darwin'
                ? {
                      titleBarStyle: 'hidden',
                      trafficLightPosition: {x: 17, y: 25},
                  }
                : {}),
            icon: process.platform === 'linux' ? ABOUT_PANEL_OPTIONS.iconPath : undefined,
            width,
            height,
            x,
            y,
            show: !(
                import.meta.env.BUILD_MODE === 'testing' &&
                process.env.PLAYWRIGHT_HEADLESS === 'true'
            ),
            webPreferences: {
                // # SECURITY
                //
                // We disable node integration (i.e. access to NodeJS APIs from JS code) in the
                // renderer. Communication with the main process happens through the Electron
                // context bridge via IPC (set up in the preload script). We enable
                // `contextIsolation`, and sandboxing is enabled by default.
                //
                // Unfortunately we cannot get rid of `nodeIntegrationInWorker` because preload
                // scripts for workers are not currently supported by Electron[1]. We try to
                // compensate for this using the `script-src` in our Content Security Policy (CSP)
                // as far as possible.
                //
                // [1] https://github.com/electron/electron/issues/28620
                //
                // Preferences ordering from
                // https://www.electronjs.org/docs/latest/api/browser-window/:
                nodeIntegration: false,
                nodeIntegrationInWorker: true, // TODO(DESK-79): Change to false once worker preload scripts are supported in Electron
                nodeIntegrationInSubFrames: false,
                preload: path.join(__dirname, '..', 'electron-preload', 'electron-preload.cjs'),
                // TODO(DESK-79): Enable `sandbox: true` once worker preload scripts are supported in Electron
                webSecurity: true,
                allowRunningInsecureContent: false,
                webgl: false,
                plugins: false,
                experimentalFeatures: false,
                disableBlinkFeatures: [].join(','),
                contextIsolation: true,
                webviewTag: false,
                navigateOnDragDrop: false,
                spellcheck: electronSettings.spellCheck.enabled,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                enableWebSQL: false,
            },
            minHeight: 420,
            minWidth: 92 + 308 + 64,
        });

        if (import.meta.env.BUILD_ENVIRONMENT !== 'onprem') {
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
                    window.webContents,
                ),
            );
        }

        // Only macOS: if set, quit and terminate app (instead of just hiding the window)
        let forceQuit = false;
        electron.app.on('before-quit', () => {
            forceQuit = true;
        });

        // Only macOS: show hidden window again if it becomes active (clicking on notifications,
        // macOS App Switcher, ...)
        electron.app.on('did-become-active', () => {
            const currentWindow = unwrap(window, 'Window is undefined in on:did-become-active');
            if (!currentWindow.isVisible()) {
                currentWindow.show();
            }
        });

        window.on('close', (event) => {
            const currentWindow = unwrap(window, 'Window is undefined in on:close');
            if (process.platform === 'darwin' && !forceQuit) {
                // On macOS don't quit app if window was closed
                event.preventDefault();
                currentWindow.hide();
            } else {
                updateElectronSettings(
                    {
                        window: {
                            width:
                                currentWindow.getSize()[0] ??
                                DEFAULT_ELECTRON_SETTINGS.window.width,
                            height:
                                currentWindow.getSize()[1] ??
                                DEFAULT_ELECTRON_SETTINGS.window.height,
                            offsetX: window?.getPosition()[0],
                            offsetY: window?.getPosition()[1],
                        },
                    },
                    appPath,
                    log,
                );
            }
        });

        window.on('closed', () => {
            window = undefined;
        });

        window.webContents.on('context-menu', (event, params) => {
            // Do nothing if we don't have a window / input frame or the element is not editable
            if (window === undefined || params.frame === null || !params.isEditable) {
                return;
            }

            const menu = Menu.buildFromTemplate([{role: 'editMenu'}]);

            if (process.platform === 'darwin') {
                // Add each spelling suggestion
                for (const suggestion of params.dictionarySuggestions) {
                    menu.append(
                        new electron.MenuItem({
                            label: suggestion,
                            // eslint-disable-next-line @typescript-eslint/no-loop-func
                            click: () => window?.webContents.replaceMisspelling(suggestion),
                        }),
                    );
                }

                // Allow users to add the misspelled word to the dictionary
                // TODO(DESK-1512) Add a mapping for different languages
                if (params.misspelledWord.length !== 0) {
                    menu.append(
                        new electron.MenuItem({
                            label: 'Add to dictionary',
                            click: () =>
                                window?.webContents.session.addWordToSpellCheckerDictionary(
                                    params.misspelledWord,
                                ),
                        }),
                    );
                }
            }

            menu.popup({
                frame: params.frame,
            });
        });

        if (import.meta.env.DEBUG) {
            window.webContents.openDevTools();
        }
        log.debug(
            `Running in mode: ${import.meta.env.BUILD_MODE} with parameters:\n`,
            JSON.stringify(parameters),
        );
        log.info(`Serving app from ${appBaseUrl}`);
        window
            .loadURL(`${appBaseUrl}`)
            .catch((error: unknown) => log.error(`Unable to load URL ${appBaseUrl}`, error));
        if (!import.meta.env.DEBUG) {
            // In release builds, we don't include the "Toggle Developer Tools" menu entry. Without the
            // menu entry, the corresponding keyboard shortcut (Ctrl+Shift+i) doesn't work anymore.
            // Therefore, in debug builds, manually toggle the dev tools.
            window.webContents.on('before-input-event', (event, input) => {
                if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                    if (window !== undefined) {
                        if (window.webContents.isDevToolsOpened()) {
                            window.webContents.closeDevTools();
                        } else {
                            window.webContents.openDevTools();
                        }
                    }
                }
            });
        }

        // Only grant required permissions, deny everything else. Deny if any
        // other URL has been provided.
        function handlePermissionRequest(
            contents: Electron.WebContents,
            permission: string,
            details:
                | Electron.PermissionCheckHandlerHandlerDetails // From setPermissionCheckHandler
                | Electron.PermissionRequest // From setPermissionRequestHandler
                | Electron.FilesystemPermissionRequest // From setPermissionRequestHandler
                | Electron.MediaAccessPermissionRequest // From setPermissionRequestHandler
                | Electron.OpenExternalPermissionRequest, // From setPermissionRequestHandler
        ): boolean {
            function deny(error: string): false {
                log.error(error);
                return false;
            }
            function allow(): true {
                log.info(`Allowed permission: ${permission}`);
                return true;
            }

            // The app is only served from one URL that may request permissions.
            // Only the main frame may request it and external URLs may not be loaded.
            if (!isValidAppUrl(contents.getURL())) {
                return deny(
                    `Permission request from unexpected URL ${contents.getURL()}: ${permission}`,
                );
            }
            if (!isValidAppUrl(details.requestingUrl)) {
                return deny(
                    `Permission request from unexpected requesting URL ${details.requestingUrl}: ${permission}`,
                );
            }
            if (!details.isMainFrame) {
                return deny(`Permission request from non-main thread: ${permission}`);
            }

            // Allow specific permissions
            //
            // Rationale for non-obvious ones:
            //
            // - fullscreen: For video playback
            // - media: For microphone/camera access in a call
            if (
                [
                    'notifications',
                    'clipboard-sanitized-write',
                    'fullscreen',
                    'media',
                    'speaker-selection',
                ].includes(permission)
            ) {
                return allow();
            }

            // Deny all other permissions
            return deny(`Denied permission request: ${permission}`);
        }

        session.setPermissionRequestHandler((contents, permission, callback, details) => {
            callback(handlePermissionRequest(contents, permission, details));
        });

        session.setPermissionCheckHandler((contents, permission, origin, details) => {
            if (contents === null) {
                // Allow notifications and clipboard write
                if (['notifications', 'clipboard-sanitized-write'].includes(permission)) {
                    return true;
                }

                // Deny anything else without 'contents'
                log.error(
                    `Unexpected synchronous permission check without contents (origin=${origin}, permission=${permission})`,
                );
                return false;
            }
            return handlePermissionRequest(contents, permission, details);
        });

        let connectSrcRule: string;
        switch (import.meta.env.BUILD_ENVIRONMENT) {
            case 'live':
            case 'sandbox':
                connectSrcRule = "connect-src 'self' https://*.threema.ch wss://*.threema.ch";
                break;

            case 'onprem':
                // TODO(DESK-1324): For OnPrem builds, we don't know the valid domain patterns in
                // advance. Can we find a workaround?
                connectSrcRule = 'connect-src *';
                break;

            default:
                unreachable(import.meta.env.BUILD_ENVIRONMENT);
        }

        // Apply a strict content security policy to any response
        session.webRequest.onHeadersReceived((details, callback) => {
            if (details.url.startsWith('devtools://')) {
                // Leave `devtools://` headers as-is
                return callback({responseHeaders: details.responseHeaders});
            }
            return callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        // Fetch directives
                        "default-src 'none'",
                        "manifest-src 'self'",
                        "child-src 'none'",
                        connectSrcRule,
                        "font-src 'self' https://static.threema.ch",
                        "frame-src 'none'",
                        "img-src 'self' data: blob:",
                        "media-src 'self' data: blob:",
                        "object-src 'none'",
                        // Note: wasm-unsafe-eval is a requirement for being able to load any
                        //       WebAssembly module.
                        ...(!import.meta.env.DEBUG
                            ? // Note: This case needs to be first, because integrity hashes will be
                              // inserted here!
                              [
                                  "script-src 'wasm-unsafe-eval'",
                                  // `'self'` and `'strict-dynamic'` are both needed at the same
                                  // time to ensure the hashes (which are inserted by the
                                  // `SubresourceIntegrityPlugin` at build time) are actually
                                  // checked.
                                  "style-src 'self' 'strict-dynamic'",
                                  // prettier-ignore
                                  "worker-src",
                              ]
                            : [
                                  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
                                  "style-src 'self' 'unsafe-inline'",
                                  "worker-src 'self'",
                              ]),

                        // Document directives
                        "base-uri 'none'",
                        // Sandbox directive:
                        //
                        // - allow-downloads: Allows for downloads after the user clicks a button or link
                        // - allow-same-origin: Allows the content to be treated as being from its normal origin
                        // - allow-scripts: Allows the page to run scripts
                        // - allow-forms: Allows the page to submit forms
                        // - allow-popups: Needed to open URLs in external browser
                        'sandbox allow-downloads allow-same-origin allow-scripts allow-forms allow-popups',

                        // Navigation directives
                        "form-action 'none'",
                        "frame-ancestors 'none'",

                        // Other directives
                        'upgrade-insecure-requests',
                    ].join('; '),
                },
            });
        });

        // Disable the dictionary for good
        session.setSpellCheckerDictionaryDownloadURL('https://threema.invalid/');
        session.setSpellCheckerEnabled(electronSettings.spellCheck.enabled);

        // Register request handler for screen sharing
        session.setDisplayMediaRequestHandler(
            ({frame, videoRequested, audioRequested}, callback) => {
                validateSenderFrame(frame);
                assert(videoRequested, 'Not requesting a video stream, abort');
                assert(!audioRequested, 'Should not request an audio stream, abort');

                electron.desktopCapturer
                    .getSources({
                        types: ['screen', 'window'],
                        thumbnailSize: {height: 256, width: 256},
                        fetchWindowIcons: true,
                    })
                    .then((sources) => {
                        const isWayland =
                            process.platform === 'linux' &&
                            (process.env.XDG_SESSION_TYPE === 'wayland' ||
                                Boolean(process.env.WAYLAND_DISPLAY));

                        if (isWayland) {
                            // Window picker should be displayed by a wayland desktop portal, so
                            // just grant access to the first screen found.
                            callback({video: sources[0]});
                        } else {
                            // Electron does not support the Windows system picker, so we have to
                            // present a custom one.
                            electron.ipcMain.once(
                                ElectronIpcCommand.SCREEN_SHARING_SCREEN_SELECTED,
                                (event: IpcMainEvent, sourceId: string | undefined) => {
                                    validateSenderFrame(event.senderFrame);
                                    const source =
                                        sourceId !== undefined
                                            ? sources.find((s) => s.id === sourceId)
                                            : undefined;

                                    if (source === undefined) {
                                        try {
                                            callback({});
                                        } catch {
                                            log.debug('Screen sharing request was canceled');
                                            // Electron throws error here, but this is the only way
                                            // to cancel the request.
                                        }
                                    } else {
                                        log.debug(
                                            `Starting screen sharing, source: ${source.name} (${source.id})`,
                                        );
                                        callback({video: source});
                                    }
                                },
                            );

                            log.debug('Requesting custom screen sharing picker');
                            frame?.send(
                                ElectronIpcCommand.SCREEN_SHARING_PRESENT_PICKER,
                                mapToScreenSharingSources(sources),
                            );
                        }
                    })
                    .catch((error: unknown) => {
                        log.error('Desktop capturer failed, no screen sources available', error);
                    });
            },
            // If true, use the system picker if available.
            // Note: this is currently experimental. If the system picker
            // is available, it will be used and the media request handler
            // will not be invoked.
            {useSystemPicker: true},
        );
    }

    // Disallow navigation, creation of new windows or web views
    electron.app.on('web-contents-created', (_, contents) => {
        contents.on('will-navigate', (event, toUrl) => {
            // Do not allow navigating to a different URL (but allow changes of the fragment)
            if (!isValidAppUrl(toUrl)) {
                log.error(`Security violation: Attempt to navigate to ${toUrl}`);
                event.preventDefault();
            }
        });

        contents.setWindowOpenHandler((handler) => {
            // We only allow opening URLs that can be parsed by URL and only allow
            // certain protocols. Some more details on potential exploits are given
            // in https://benjamin-altpeter.de/shell-openexternal-dangers/.
            const protocol = new URL(handler.url).protocol;
            const allowedProtocols = ['http:', 'https:', 'mailto:'];
            if (allowedProtocols.includes(protocol)) {
                log.debug(`Opening URL in external browser`);
                electron.shell.openExternal(handler.url).catch((error: unknown) => {
                    log.error('Unable to open external URL', error);
                });
            } else {
                log.warn(`Deny opening URL with disallowed protocol: ${handler.url}`);
            }
            return {action: 'deny'};
        });

        contents.on('will-attach-webview', (event) => {
            log.error('Security violation: Attempt to create a web view');
            event.preventDefault();
        });
    });

    // In internal test builds on sandbox, we enable crash reporting.
    //
    // No automatic crash reporting or telemetry of any kind is being done in production builds!
    electron.crashReporter.start(
        import.meta.env.MINIDUMP_ENDPOINT === undefined
            ? {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  submitURL: 'https://threema.invalid/crash-report',
                  uploadToServer: false,
                  ignoreSystemCrashHandler: true,
              }
            : {
                  // eslint-disable-next-line @typescript-eslint/naming-convention
                  submitURL: import.meta.env.MINIDUMP_ENDPOINT,
                  companyName: 'Threema',
                  productName: import.meta.env.APP_NAME,
                  ignoreSystemCrashHandler: true,
              },
    );

    // Handle renderer crashes
    electron.app.on('render-process-gone', (_, contents, details) => {
        log.info(`Render process gone: ${details.reason}`);
        if (details.reason === 'crashed') {
            log.warn(`Crash reports can be found in ${electron.app.getPath('crashDumps')}`);
            handleCriticalError(
                'renderer or worker',
                {
                    message: `Render process crashed: reason=${details.reason}, exitCode=${details.exitCode}`,
                },
                window?.webContents,
            );
        }
    });

    electron.app.on('second-instance', () => {
        log.debug(
            'A second instance was requested, but will be handled by the existing instance instead',
        );

        if (window !== undefined) {
            if (window.isMinimized()) {
                log.debug('Restoring the original main window');
                window.restore();
            }

            // `alwaysOnTop` ensures that the window doesn't appear behind other windows in Windows
            window.setAlwaysOnTop(true);
            if (window.isVisible()) {
                log.debug('Focusing on the visible main window');
                window.focus();
            } else {
                log.debug('Showing and focusing on the main window');
                window.show();
            }
            window.setAlwaysOnTop(false);
        }
    });

    // On macOS it is common to re-create a window even after all windows have been closed
    electron.app.on('activate', () => {
        if (electron.app.isReady()) {
            start();
        } else {
            log.debug('Activate event triggered but app not ready.');
        }
    });

    // Create main BrowserWindow when electron is ready
    electron.app.on('ready', () => start());

    electron.powerMonitor.on('suspend', () => {
        if (window === undefined) {
            return;
        }
        window.webContents.send(ElectronIpcCommand.SYSTEM_SUSPENDING);
    });

    electron.powerMonitor.on('lock-screen', () => {
        if (window === undefined) {
            return;
        }
        window.webContents.send(ElectronIpcCommand.SYSTEM_SUSPENDING);
    });

    // Check if we have missed an 'activate'/'ready' event and need to start
    if (signal.start) {
        start();
    }
}

// Temporarily set primitive assertion failed logger, then initialise and run main app
setAssertFailLogger((error) => CONSOLE_LOGGER.error(extractErrorTraceback(error)));
(async () => {
    const signal = {start: false};

    // Register custom threemadesktop:// protocol
    //
    // See https://www.electronjs.org/docs/latest/tutorial/security#18-avoid-usage-of-the-file-protocol-and-prefer-usage-of-custom-protocols
    electron.protocol.registerSchemesAsPrivileged([
        {
            scheme: 'threemadesktop',
            /* eslint-disable @typescript-eslint/naming-convention */
            privileges: {
                // Treat scheme as "standard-format" URL scheme. See https://chromium.googlesource.com/chromium/src/+/HEAD/url/url_util.h
                standard: true,
                // Treat scheme as a secure origin, i.e. don't trigger mixed content warnings with https
                secure: true,
                // Don't bypass CSP
                bypassCSP: false,
                // Allow using the fetch API
                supportFetchAPI: true,
                // We don't currently use service workers
                allowServiceWorkers: false,
            },
            /* eslint-enable @typescript-eslint/naming-convention */
        },
    ]);

    // Quit application when all windows are closed
    electron.app.on('window-all-closed', () => electron.app.quit());

    // Buffer 'activate'/'ready' event
    electron.app.once('activate', () => (signal.start = true));
    electron.app.once('ready', () => (signal.start = true));

    // Initialise
    let result;
    try {
        result = await init();
    } catch (error) {
        const stacktrace = error instanceof Error ? extractErrorTraceback(error) : undefined;
        handleCriticalError('main', {
            message: `Main process failed to initialise`,
            stacktrace,
        });
        return;
    }

    // Acquire lock that can be used for ensuring a single instance
    if (result.parameters['single-instance-lock'] ?? !import.meta.env.DEBUG) {
        const singleInstanceLock = electron.app.requestSingleInstanceLock();
        if (!singleInstanceLock) {
            log.error('Application is already open, refusing to start a second instance');
            electron.app.exit(0);
        }
    }

    // Run main app
    try {
        main(result, signal);
    } catch (error) {
        const stacktrace = error instanceof Error ? extractErrorTraceback(error) : undefined;
        handleCriticalError('main', {
            message: `Main process crashed`,
            stacktrace,
        });
    }
})().catch(assertUnreachable);
