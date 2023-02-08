import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import {pathToFileURL, URL} from 'node:url';

import * as v from '@badrap/valita';
import * as electron from 'electron';
import {type MenuItemConstructorOptions} from 'electron';

import {type ErrorDetails, type SystemInfo} from '~/common/electron-ipc';
import {ElectronIpcCommand} from '~/common/enum';
import {extractErrorTraceback} from '~/common/error';
import {
    CONSOLE_LOGGER,
    type Logger,
    type LoggerFactory,
    TagLogger,
    TeeLogger,
} from '~/common/logging';
import {directoryModeInternalObjectIfPosix} from '~/common/node/fs';
import {FileLogger} from '~/common/node/logging';
import {type u53} from '~/common/types';
import {ensureError} from '~/common/utils/assert';

const EXIT_CODE_UNCAUGHT_ERROR = 7;
const EXIT_CODE_RESTART = 8;

// Path name for app / user data, see
// https://www.electronjs.org/docs/latest/api/app#appgetpathname
const ELECTRON_PATH_APP_DATA = 'appData';
const ELECTRON_PATH_USER_DATA = 'userData';

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Run parameters parsed from CLI arguments.
 */
const RUN_PARAMETERS_SCHEMA = v.object({
    'profile': v.string().default('default'),
    'persist-profile': v
        .string()
        .assert((bool) => ['true', 'false'].includes(bool), "Expected 'true' or 'false'")
        .map((bool) => bool === 'true')
        .default(true),
});
type RunParameters = Readonly<v.Infer<typeof RUN_PARAMETERS_SCHEMA>>;
/**
 * Run parameter documentation.
 */
const RUN_PARAMETERS_DOCS: {readonly [K in keyof RunParameters]: string} = {
    'profile': '<session-profile-name>',
    'persist-profile': '<true|false>',
};
/* eslint-enable @typescript-eslint/naming-convention */

const ABOUT_PANEL_OPTIONS: electron.AboutPanelOptionsOptions = {
    applicationName: import.meta.env.APP_NAME,
    applicationVersion: `${import.meta.env.BUILD_VERSION} (${import.meta.env.BUILD_VARIANT}, ${
        import.meta.env.BUILD_ENVIRONMENT
    })`,
    version:
        `v${import.meta.env.BUILD_VERSION}` === import.meta.env.GIT_REVISION
            ? ''
            : import.meta.env.GIT_REVISION,
    copyright: 'Threema © 2020-2023',
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
              `${import.meta.env.BUILD_VARIANT}-${import.meta.env.BUILD_ENVIRONMENT}`,
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
//
// Note: This is the only global that is allowed since we use logging everywhere!
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
            message: `A critical error occurred in ${source}, please report this to the Threema support.\n\n${fullErrorSummary}`,
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
        .catch((e) => log.error(`Dialog promise unsuccessful: ${e}`));
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
        label: electron.app.name,
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

interface MainInit {
    readonly parameters: RunParameters;
    readonly appPath: string;
    readonly fileLogger: FileLogger | undefined;
    readonly log: Logger;
    readonly unlinkedAppPath: string;
    readonly appUrl: string;
}

// Initialise the Electron process. Nothing in here (besides `log`) is allowed to modify global
// state!
async function init(): Promise<MainInit> {
    /**
     * Return the path to the platform-specific application data base directory.
     *
     * - Windows: %APPDATA%/threema-desktop/<variant>-<environment>-<profile>
     * - Linux: $XDG_DATA_HOME/threema-desktop/<variant>-<environment>-<profile>
     *   or ~/.local/share/threema-desktop/<variant>-<environment>-<profile>
     * - macOS: ~/Library/Application Support/threema-desktop/<variant>-<environment>-<profile>
     */
    function getPersistentAppDataDir(): string[] {
        const rootDirectoryName = 'ThreemaDesktop';
        if (process.platform === 'linux') {
            // By default, Electron stores all app data in XDG_CONFIG_HOME, which is wrong. Thus,
            // override the default and use XDG_DATA_HOME instead.
            //
            // Note: Don't use dot notation below, see https://stackoverflow.com/a/72403165/284318
            // eslint-disable-next-line dot-notation
            const XDG_DATA_HOME = (process.env['XDG_DATA_HOME'] ?? '').trim();
            const baseDir =
                XDG_DATA_HOME.length > 0
                    ? XDG_DATA_HOME
                    : path.join(os.homedir(), '.local', 'share');
            return [baseDir, rootDirectoryName];
        } else {
            // On other operating systems, let Electron decide.
            return [path.join(electron.app.getPath(ELECTRON_PATH_APP_DATA), rootDirectoryName)];
        }
    }

    /**
     * Parses the following arguments into options:
     *
     * - `--profile=<session-profile-name>`
     * - `--persist-profile=<true|false>`
     */
    function parseParameters(argv: readonly string[]): RunParameters {
        // Note: The number of entries in argv depends on whether the application is packaged or not.
        //       See https://github.com/electron/electron/issues/4690 for details.
        const offset = electron.app.isPackaged ? 1 : 2;
        const entrypoint = argv.slice(0, offset).join(' ');
        const options = argv.slice(offset);
        const unverifiedParameters = options
            .map<[key?: string, value?: string]>((raw) => {
                // Handle help
                if (raw === '-h' || raw === '--help') {
                    showUsageAndExit(entrypoint);
                }

                if (raw === '--version') {
                    log.error(`${APP_NAME_AND_VERSION}`);
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
            return showUsageAndExit(entrypoint, error);
        }
    }

    // Parse CLI arguments into run parameters
    const parameters = parseParameters(process.argv);

    // Use subdirectory for user data (where Electron stores all of its data)
    // depending on build variant and profile.
    const appPath = path.join(
        ...(parameters['persist-profile']
            ? getPersistentAppDataDir()
            : [electron.app.getPath('temp'), electron.app.name]),
        `${import.meta.env.BUILD_VARIANT}-${import.meta.env.BUILD_ENVIRONMENT}-${
            parameters.profile
        }`,
    );
    if (!fs.existsSync(appPath)) {
        log.info(`Creating app data directory at ${appPath}`);
        fs.mkdirSync(appPath, {recursive: true, ...directoryModeInternalObjectIfPosix()});
    }
    // Note: This call needs to be done as early as possible.
    electron.app.setPath(ELECTRON_PATH_USER_DATA, appPath);

    // Initialise logging (for sandbox builds only)
    let logging: LoggerFactory;
    let fileLogger: FileLogger | undefined;
    const logPath = import.meta.env.LOG_PATH.MAIN_AND_APP;
    const logFilePath = path.join(appPath, ...logPath);
    if (import.meta.env.BUILD_ENVIRONMENT === 'sandbox') {
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
    // eslint-disable-next-line require-atomic-updates
    log = logging.logger('main');

    // Initial log entries
    log.info(`
Starting ${ABOUT_PANEL_OPTIONS.applicationName ?? 'Threema'}
Version information:
  Application: ${ABOUT_PANEL_OPTIONS.version}
  NodeJS: ${process.version}
  NODE_MODULE_VERSION: ${process.versions.modules}`);
    log.info(`File system storage path: ${appPath}`);

    // Unlinked app path cleanup
    const unlinkedAppPath = `${appPath}.unlinked_pending_delete`;
    let stat;
    try {
        stat = fs.statSync(unlinkedAppPath);
    } catch {
        // Path does not exist, nothing to do
    }
    if (stat !== undefined) {
        try {
            if (stat.isDirectory()) {
                log.info(`Removing unlinked profile folder ${unlinkedAppPath}`);
                fs.rmSync(unlinkedAppPath, {
                    recursive: true,
                    force: true,
                    maxRetries: 3,
                });
                log.info(`Unlinked profile folder successfully removed.`);
            }
        } catch (error) {
            log.warn(
                `Error while removing unlinked profile folder ${unlinkedAppPath}: ${
                    ensureError(error).message
                }`,
            );
        }
    }

    // Determine URL
    let appUrl: string;
    if (!import.meta.env.DEBUG) {
        appUrl = `${pathToFileURL(path.join(__dirname, '..', 'app', 'index.html'))}`;
    } else {
        appUrl = `${new URL(`http://localhost:${import.meta.env.DEV_SERVER_PORT}/`)}`;
    }

    // Done
    return {
        parameters,
        appPath,
        fileLogger,
        log,
        unlinkedAppPath,
        appUrl,
    };
}

// Run the Electron process after initialisation. This drives the state of the app. Keep this block
// to a bare minimum and move stateless functions out of it, so that state is easy to track!
function main(
    {parameters, appPath, fileLogger, unlinkedAppPath, appUrl}: MainInit,
    signal: {readonly start: boolean},
): void {
    function isValidAppUrl(url?: string): boolean {
        return url?.replace(/#.*/u, '') === appUrl;
    }

    /**
     * Whether a relaunch was already requested.
     *
     * Use this property to ensure that `relaunch()` is only called once. Otherwise, multiple windows
     * would be opened after relaunching.
     */
    let relaunchRequested = false;

    /**
     * Move the profile folder to {@link unlinkedAppPath} and make sure a relaunch was requested.
     *
     * If the profile folder cannot be moved, a message box is shown with instructions to manually
     * delete the folder.
     */
    function renameUnlinkedProfileAndRestart(): void {
        log.info(`Moving profile directory at ${appPath} to ${unlinkedAppPath}`);

        try {
            fs.renameSync(appPath, unlinkedAppPath);
        } catch (e) {
            const error = ensureError(e);
            log.error(
                `Error: Moving profile directory ${appPath} to ${unlinkedAppPath} failed:\n  ${error.message}`,
            );
            electron.dialog.showMessageBoxSync({
                title: 'Removing Old Profile Failed',
                message: `Removing profile directory failed:\n\n  ${appPath} \n\nError:\n\n  ${error.message}\n\nThis application will now close. You should manually delete the profile directory '${appPath}' before restarting the app.`,
                type: 'error',
                buttons: ['OK'],
                defaultId: 0,
            });
        }
    }

    /**
     * Schedule the execution of {@link renameUnlinkedProfileAndRestart} on quit (so that no files are still
     * opened / active) and immediately quit the application.
     */
    function scheduleRenameUnlinkedProfileAndQuit(): void {
        log.info(`Scheduled profile directory (${appPath}) rename on quit`);
        electron.app.on('quit', () => {
            renameUnlinkedProfileAndRestart();
        });

        // Close and relaunch the application
        if (!relaunchRequested) {
            // Deleting failed, restart app.
            relaunchRequested = true;
            electron.app.relaunch();
        }
        electron.app.exit(EXIT_CODE_RESTART);
    }

    let window: electron.BrowserWindow | undefined;

    function start(): void {
        // Ignore if window is still open
        if (window !== undefined) {
            log.debug('Already started, ignoring request to start');
            return;
        }
        log.info('Starting');

        // Set Electron menu
        electron.Menu.setApplicationMenu(buildElectronMenu());
        electron.app.setAboutPanelOptions(ABOUT_PANEL_OPTIONS);

        // Set up IPC message handlers
        electron.ipcMain
            .on(
                ElectronIpcCommand.ERROR,
                (event: electron.IpcMainEvent, errorDetails: ErrorDetails) => {
                    // Handle error from renderer process
                    handleCriticalError('renderer or worker', errorDetails, window?.webContents);
                },
            )
            .on(ElectronIpcCommand.GET_APP_PATH, (event: electron.IpcMainEvent) => {
                event.returnValue = electron.app.getPath(ELECTRON_PATH_USER_DATA);
            })
            .on(ElectronIpcCommand.DELETE_PROFILE_AND_RESTART, () => {
                scheduleRenameUnlinkedProfileAndQuit();
            })
            .on(
                ElectronIpcCommand.UPDATE_APP_BADGE,
                (event: electron.IpcMainEvent, totalUnreadMessageCount: u53) => {
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
            async (): Promise<SystemInfo> => {
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
                };
            },
        );
        electron.ipcMain.handle(
            ElectronIpcCommand.LOG_TO_FILE,
            (event, level: 'trace' | 'debug' | 'info' | 'warn' | 'error', data: string) =>
                // @ts-expect-error: TODO(WEBMD-684): Don't access private properties
                fileLogger?._write(level, data),
        );

        const session = parameters['persist-profile']
            ? electron.session.defaultSession
            : electron.session.fromPartition(`volatile-${parameters.profile}`);
        window = new electron.BrowserWindow({
            title: import.meta.env.APP_NAME,
            icon: process.platform === 'linux' ? ABOUT_PANEL_OPTIONS.iconPath : undefined,
            webPreferences: {
                // TODO(WEBMD-79): Harden this. Disable `nodeIntegrationInWorker` and enable `sandbox`. This means
                //       we need to have a preload script that runs for all APIs requiring access to Node
                //       (so far that is only the worker) and then expose the necessary APIs on `self`.
                //       However, this is currently not supported in Electron, see
                //       https://github.com/electron/electron/issues/28620
                //
                //       The only alternative we have right now is to harden Electron so it must not
                //       under any circumstances load any worker except our dedicated workers.
                //
                // Order from https://www.electronjs.org/docs/latest/api/browser-window/
                nodeIntegration: false,
                nodeIntegrationInWorker: true, // TODO(WEBMD-79): This must be hardened so only our workers can use it
                nodeIntegrationInSubFrames: false,
                preload: path.join(__dirname, '..', 'electron-preload', 'electron-preload.cjs'),
                // TODO(WEBMD-79): sandbox: true
                webSecurity: true,
                allowRunningInsecureContent: false,
                webgl: false,
                plugins: false,
                experimentalFeatures: false,
                disableBlinkFeatures: [].join(','), // TODO(WEBMD-79): Harden
                contextIsolation: true,
                webviewTag: false,
                navigateOnDragDrop: false,
                spellcheck: false,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                enableWebSQL: false,
            },
        });
        window.on('closed', () => {
            window = undefined;
        });

        if (import.meta.env.DEBUG) {
            window.webContents.openDevTools();
        }
        log.debug(`Running in mode: ${import.meta.env.MODE} with parameters:\n`, parameters);
        log.info(`Serving app from ${appUrl}`);
        window.loadURL(appUrl).catch((error) => log.error(`Unable to load URL ${appUrl}`, error));

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
                | Electron.PermissionRequestHandlerHandlerDetails
                | Electron.PermissionCheckHandlerHandlerDetails,
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
                return deny(`Permission request from unexpected URL ${contents.getURL()}`);
            }
            if (!isValidAppUrl(details.requestingUrl)) {
                return deny(
                    `Permission request from unexpected requesting URL ${details.requestingUrl}`,
                );
            }
            if (!details.isMainFrame) {
                return deny(`Permission request from non-main thread`);
            }

            // Allow notifications
            if (permission === 'notifications') {
                return allow();
            }

            // Allow writing to clipboard
            if (permission === 'clipboard-sanitized-write') {
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
                // Allow 'background-sync' in dev mode
                if (import.meta.env.DEBUG && permission === 'background-sync') {
                    return true;
                }

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
            return callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'Content-Security-Policy': [
                        // Fetch directives
                        "default-src 'self'",
                        "child-src 'none'",
                        // "connect-src 'self' https://*.threema.ch wss://*.threema.ch", // TODO(WEBMD-707): Restrict csp again
                        'connect-src *',
                        "font-src 'self' https://static.threema.ch",
                        "frame-src 'none'",
                        "img-src 'self' data: blob:",
                        "object-src 'none'",
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO(WEBMD-81): Remove unsafe-inline and unsafe-eval
                        // "style-src 'self' https://static.threema.ch",
                        "style-src 'self' 'unsafe-inline' https://static.threema.ch", // TODO(WEBMD-81): Remove unsafe-inline and unsafe-eval
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
                void electron.shell.openExternal(handler.url);
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

    // Handle crash events
    electron.crashReporter.start({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        submitURL: 'https://threema.invalid/crash-report',
        uploadToServer: false,
        ignoreSystemCrashHandler: true,
    });

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

    // On macOS it is common to re-create a window even after all windows have been closed
    electron.app.on('activate', () => start());

    // Create main BrowserWindow when electron is ready
    electron.app.on('ready', () => start());

    // Check if we have missed an 'activate'/'ready' event and need to start
    if (signal.start) {
        start();
    }
}

// Initialise and run main app
void (async () => {
    const signal = {start: false};

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

    // Run main app
    try {
        main(result, signal);
    } catch (error) {
        const stacktrace = error instanceof Error ? extractErrorTraceback(error) : undefined;
        handleCriticalError('main', {
            message: `Main process crashed`,
            stacktrace,
        });
        return;
    }
})();
