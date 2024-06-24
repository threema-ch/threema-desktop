import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import {pathToFileURL, URL} from 'node:url';

import * as v from '@badrap/valita';
import type {MenuItemConstructorOptions} from 'electron';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as electron from 'electron';

import type {DeleteProfileOptions, ErrorDetails, SystemInfo} from '~/common/electron-ipc';
import {ElectronIpcCommand} from '~/common/enum';
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
import {directoryModeInternalObjectIfPosix} from '~/common/node/fs';
import {FileLogger} from '~/common/node/logging';
import {removeOldProfiles, getLatestProfilePath} from '~/common/node/old-profiles';
import {
    ensureSpkiValue,
    type DomainCertificatePin,
    type ReadonlyUint8Array,
    type u53,
} from '~/common/types';
import {
    assert,
    assertUnreachable,
    ensureError,
    setAssertFailLogger,
    unreachable,
    unwrap,
} from '~/common/utils/assert';
import {base64ToU8a} from '~/common/utils/base64';

import {createTlsCertificateVerifier} from './tls-cert-verifier';

const EXIT_CODE_UNCAUGHT_ERROR = 7;
const EXIT_CODE_RESTART = 8;
const EXIT_CODE_DELETE_PROFILE_AND_RESTART = 9;
const EXIT_CODE_RENAME_PROFILE_AND_RESTART = 10;

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
const RUN_PARAMETERS_SCHEMA = v.object({
    'profile': v
        .string()
        .default('default')
        .chain((s) => {
            if (s.match(/^[0-9a-z]+$/u)) {
                return v.ok(s);
            }
            return v.err('Profile name is only allowed to contain lower-case letters or numbers');
        }),
    'single-instance-lock': RUN_PARAMETER_BOOL_SCHEMA.optional(),
});
type RunParameters = Readonly<v.Infer<typeof RUN_PARAMETERS_SCHEMA>>;

/**
 * Run parameter documentation.
 */
const RUN_PARAMETERS_DOCS: {readonly [K in keyof RunParameters]: string} = {
    'profile':
        '<session-profile-name> – The name of the profile to use. Only lower-case letters and numbers are allowed. "default" by default.',
    'single-instance-lock':
        '<true|false> – Prevent running multiple instances of Threema Desktop at the same time (default: "true"). Development option, disable at your own risk!',
};

const ABOUT_PANEL_OPTIONS: electron.AboutPanelOptionsOptions = {
    applicationName: import.meta.env.APP_NAME,
    applicationVersion: `${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_FLAVOR})`,
    version:
        `v${import.meta.env.BUILD_VERSION}` === import.meta.env.GIT_REVISION
            ? ''
            : import.meta.env.GIT_REVISION,
    copyright: 'Threema © 2020-2024',
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
            message: `A critical error occurred in ${source}, please report this error to Threema Support from Threema on your mobile device (Settings > Beta Feedback).\n\n${fullErrorSummary}`,
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
        return entries.filter((entry) => entry !== undefined) as MenuItemConstructorOptions[];
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

async function loadCompressedLogBytes(filePath: string): Promise<ReadonlyUint8Array> {
    const compressor = new ZlibCompressor();
    const bytes = await fs.promises.readFile(filePath);
    return await compressor.compress('gzip', bytes);
}

// IPC message handler validation
//
// See https://www.electronjs.org/docs/latest/tutorial/security#17-validate-the-sender-of-all-ipc-messages
function validateSenderFrame(senderFrame: Electron.WebFrameMain): void {
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

interface MainInit {
    readonly parameters: RunParameters;
    readonly appPath: string;
    readonly fileLogger: FileLogger | undefined;
    readonly log: Logger;
    readonly appUrl: string;
    readonly electronSettings: ElectronSettings;
}

// Initialise the Electron process. Nothing in here (besides `log`) is allowed to modify global
// state!
async function init(): Promise<MainInit> {
    /**
     * Return the path to the platform-specific application data base directory.
     *
     * - Linux / BSD: $XDG_DATA_HOME/ThreemaDesktop/ or ~/.local/share/ThreemaDesktop/
     * - macOS: ~/Library/Application Support/ThreemaDesktop/
     * - Windows: %APPDATA%/ThreemaDesktop/
     * - Other: ~/.ThreemaDesktop/
     */
    function getPersistentAppDataBaseDir(): string[] {
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
    const electronSettings = loadElectronSettings(appPath, log);

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
    let appUrl: string;
    if (!import.meta.env.DEBUG) {
        appUrl = 'threemadesktop://app/';
    } else {
        appUrl = `${new URL(`http://localhost:${import.meta.env.DEV_SERVER_PORT}/`)}`;
    }

    // Done
    return {
        parameters,
        appPath,
        fileLogger,
        log,
        appUrl,
        electronSettings,
    };
}

// Run the Electron process after initialisation. This drives the state of the app. Keep this block
// to a bare minimum and move stateless functions out of it, so that state is easy to track!
function main(
    {parameters, appPath, fileLogger, appUrl, electronSettings}: MainInit,
    signal: {readonly start: boolean},
): void {
    function isValidAppUrl(url?: string): boolean {
        return url?.replace(/#.*/u, '') === appUrl;
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
        mode: 'restart' | 'delete-profile-and-restart' | 'rename-profile-and-restart',
    ): void {
        switch (mode) {
            case 'restart': {
                log.info(`Requesting app restart`);
                return electron.app.exit(EXIT_CODE_RESTART);
            }
            case 'delete-profile-and-restart': {
                log.info(`Requesting profile deletion and app restart`);
                return electron.app.exit(EXIT_CODE_DELETE_PROFILE_AND_RESTART);
            }
            case 'rename-profile-and-restart': {
                log.info(`Requesting profile renaming and app restart`);
                return electron.app.exit(EXIT_CODE_RENAME_PROFILE_AND_RESTART);
            }
            default:
                return unreachable(mode);
        }
    }

    // Main app window.
    let window: electron.BrowserWindow | undefined;

    function start(): void {
        // Ignore if window is still open
        if (window !== undefined) {
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
                    } catch (error) {
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
        electron.ipcMain.handle(ElectronIpcCommand.IS_FILE_LOGGING_ENABLED, (event) => {
            validateSenderFrame(event.senderFrame);
            return fileLogger !== undefined;
        });
        electron.ipcMain.on(
            ElectronIpcCommand.SET_FILE_LOGGING_ENABLED_AND_RESTART,
            (event, enabled: boolean) => {
                validateSenderFrame(event.senderFrame);
                if (!enabled) {
                    const mainAppLogPath = getMainAppLogPath(appPath);
                    if (fs.existsSync(mainAppLogPath)) {
                        try {
                            fs.truncateSync(mainAppLogPath, 0);
                        } catch (error) {
                            log.error(
                                `Failed to truncate file ${mainAppLogPath}:
                                ${ensureError(error).message}`,
                            );
                        }
                    }
                    const logBackendPath = getBackendWorkerLogPath(appPath);
                    if (fs.existsSync(logBackendPath)) {
                        try {
                            fs.truncateSync(logBackendPath, 0);
                        } catch (error) {
                            log.error(
                                `Failed to truncate file ${logBackendPath}:
                                ${ensureError(error).message}`,
                            );
                        }
                    }
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

        electron.ipcMain.on(
            ElectronIpcCommand.UPDATE_PUBLIC_KEY_PINS,
            (event, publicKeyPins: DomainCertificatePin[]) => {
                validateSenderFrame(event.senderFrame);
                // Sanity check because we do not want non-onprem builds to tamper with the pins.
                assert(import.meta.env.BUILD_ENVIRONMENT === 'onprem');
                session.setCertificateVerifyProc(createTlsCertificateVerifier(publicKeyPins, log));
            },
        );

        const session = electron.session.defaultSession;

        session.setCertificateVerifyProc(
            createTlsCertificateVerifier(
                import.meta.env.TLS_CERTIFICATE_PINS?.map((pin) => ({
                    domain: pin.domain,
                    spkis: pin.spkis.map((val) => ({
                        algorithm: val.algorithm,
                        value: ensureSpkiValue(base64ToU8a(val.value)),
                    })),
                })),
                log,
            ),
        );
        const isMacOrWindows = process.platform === 'win32' || process.platform === 'darwin';
        window = new electron.BrowserWindow({
            title: import.meta.env.APP_NAME,
            icon: process.platform === 'linux' ? ABOUT_PANEL_OPTIONS.iconPath : undefined,
            width: electronSettings.window.width,
            height: electronSettings.window.height,
            x: isMacOrWindows ? electronSettings.window.offsetX : undefined,
            y: isMacOrWindows ? electronSettings.window.offsetY : undefined,
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
                spellcheck: false,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                enableWebSQL: false,
            },
            minHeight: 420,
            minWidth: 420,
        });

        window.on('close', () => {
            const currentWindow = unwrap(window, 'Window is undefined in on:close');
            updateElectronSettings(
                {
                    window: {
                        width: currentWindow.getSize()[0] ?? DEFAULT_ELECTRON_SETTINGS.window.width,
                        height:
                            currentWindow.getSize()[1] ?? DEFAULT_ELECTRON_SETTINGS.window.height,
                        offsetX: window?.getPosition()[0],
                        offsetY: window?.getPosition()[1],
                    },
                },
                appPath,
                log,
            );
        });
        window.on('closed', () => {
            window = undefined;
        });

        if (import.meta.env.DEBUG) {
            window.webContents.openDevTools();
        }
        log.debug(`Running in mode: ${import.meta.env.BUILD_MODE} with parameters:\n`, parameters);
        log.info(`Serving app from ${appUrl}`);
        window
            .loadURL(appUrl)
            .catch((error: unknown) => log.error(`Unable to load URL ${appUrl}`, error));
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
                ['notifications', 'clipboard-sanitized-write', 'fullscreen', 'media'].includes(
                    permission,
                )
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

        // Apply a strict content security policy to any response
        session.webRequest.onHeadersReceived((details, callback) => {
            if (details.url.startsWith('devtools://')) {
                // Leave `devtools://` headers as-is
                return callback({responseHeaders: details.responseHeaders});
            }
            // Note: For OnPrem builds, we don't know the valid domain patterns in advance
            // TODO(DESK-1324): Can we find a workaround?
            const securityRule =
                import.meta.env.BUILD_ENVIRONMENT === 'onprem'
                    ? 'connect-src *'
                    : "connect-src 'self' https://*.threema.ch wss://*.threema.ch";
            return callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        // Fetch directives
                        "default-src 'self'",
                        "child-src 'none'",
                        securityRule,
                        "font-src 'self' https://static.threema.ch",
                        "frame-src 'none'",
                        "img-src 'self' data: blob:",
                        "media-src 'self' data: blob:",
                        "object-src 'none'",
                        // TODO(DESK-154): Get rid of 'unsafe-inline' by generating and injecting
                        //       script and stylesheet resource hashes using our build system. This
                        //       probably requires writing a custom Vite plugin.
                        //
                        // Note: wasm-unsafe-eval is a requirement for being able to load any
                        //       WebAssembly module.
                        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
                        "style-src 'self' 'unsafe-inline' https://static.threema.ch",
                        "worker-src 'self'",

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
                        "navigate-to 'none'",

                        // Other directives
                        'upgrade-insecure-requests',
                    ].join('; '),
                },
            });
        });

        // Disable the dictionary for good
        session.setSpellCheckerDictionaryDownloadURL('https://threema.invalid/');
        session.setSpellCheckerEnabled(false);
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
            const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:', 'mailto:', 'jitsi-meet:'];
            if (allowedProtocols.includes(protocol)) {
                log.info(`Opening URL in external browser: ${handler.url}`);
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
    electron.app.on('activate', () => start());

    // Create main BrowserWindow when electron is ready
    electron.app.on('ready', () => start());

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
