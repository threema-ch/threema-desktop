import '../sass/app.scss';

import initComposeArea from '@threema/compose-area/web';

import {APP_CONFIG} from '~/app/config';
import {globals} from '~/app/globals';
import {Router, type RouterState} from '~/app/routing/router';
import type {AppServices} from '~/app/types';
import App from '~/app/ui/App.svelte';
import PasswordInput from '~/app/ui/PasswordInput.svelte';
import {GlobalHotkeyManager} from '~/app/ui/hotkey';
import * as i18n from '~/app/ui/i18n';
import type {LinkingParams, OppfConfig} from '~/app/ui/linking';
import LinkingWizard from '~/app/ui/linking/LinkingWizard.svelte';
import {attachSystemDialogs} from '~/app/ui/system-dialogs';
import {SystemTimeStore} from '~/app/ui/time';
import {STATIC_CONFIG, type StaticConfig} from '~/common/config';
import type {LinkingState} from '~/common/dom/backend';
import {BackendController} from '~/common/dom/backend/controller';
import {randomBytes} from '~/common/dom/crypto/random';
import {DOM_CONSOLE_LOGGER} from '~/common/dom/logging';
import {BlobCacheService} from '~/common/dom/ui/blob-cache';
import {LocalStorageController} from '~/common/dom/ui/local-storage';
import {FrontendMediaService} from '~/common/dom/ui/media';
import {FrontendNotificationCreator} from '~/common/dom/ui/notification';
import {ProfilePictureService} from '~/common/dom/ui/profile-picture';
import {appVisibility, getAppVisibility} from '~/common/dom/ui/state';
import {FrontendSystemDialogService} from '~/common/dom/ui/system-dialog';
import {applyThemeBranding} from '~/common/dom/ui/theme';
import {checkForUpdate} from '~/common/dom/update-check';
import {initCrashReportingInSandboxBuilds} from '~/common/dom/utils/crash-reporting';
import {createEndpointService} from '~/common/dom/utils/endpoint';
import type {ElectronIpc, SystemInfo} from '~/common/electron-ipc';
import {extractErrorTraceback} from '~/common/error';
import {RemoteFileLogger, TagLogger, TeeLogger} from '~/common/logging';
import type {SettingsService} from '~/common/model/types/settings';
import type {DomainCertificatePin, u53} from '~/common/types';
import {assertUnreachable, unwrap} from '~/common/utils/assert';
import {Delayed} from '~/common/utils/delayed';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {ReadableStore} from '~/common/utils/store';
import {TIMER} from '~/common/utils/timer';

// Extend global APIs
//
// TODO(DESK-684): Consider using comlink/endpoint for IPC communication
declare global {
    interface Window {
        /**
         * The window.app property exposes the IPC interface towards the renderer thread. It is
         * initialized in the preload script.
         */
        readonly app: ElectronIpc;
    }
}

export interface Elements {
    readonly splash: HTMLElement;
    readonly container: HTMLElement;
    readonly systemDialogs: HTMLElement;
}

/**
 * Attach linking wizard.
 */
function attachLinkingWizard(elements: Elements, params: LinkingParams): LinkingWizard {
    elements.container.innerHTML = '';
    return new LinkingWizard({
        target: elements.container,
        props: {
            params,
        },
    });
}

/**
 * Show password input component.
 */
function attachPasswordInput(
    elements: Elements,
    previouslyAttemptedPassword?: string,
): PasswordInput {
    elements.container.innerHTML = '';
    return new PasswordInput({
        target: elements.container,
        props: {
            previouslyAttemptedPassword,
        },
    });
}

/**
 * Attach app to DOM.
 */
function attachApp(services: AppServices, elements: Elements): App {
    const log = services.logging.logger('attach');

    // Hide splash screen and remove it entirely after 1s
    elements.splash.classList.add('hidden');
    TIMER.sleep(1000)
        .then(() => elements.splash.remove())
        .catch(assertUnreachable);

    // Create app
    elements.container.innerHTML = '';
    const app = new App({
        target: elements.container,
        props: {
            services,
        },
    });
    log.info('App started');
    return app;
}

/**
 * Check for updates. If an update is available, show a dialog to the user.
 */
async function updateCheck(
    services: Pick<AppServices, 'logging' | 'systemDialog'>,
    staticConfig: StaticConfig,
    systemInfo: SystemInfo,
): Promise<void> {
    const {logging} = services;
    const log = logging.logger('update-check');
    log.info('Checking for updates...');

    // Check for updates. If update is found, notify user after a short delay.
    const updateInfo = await checkForUpdate(staticConfig, log, systemInfo);
    if (updateInfo !== undefined) {
        await TIMER.sleep(3000);
        log.info(`Update available: ${updateInfo.version}`);
        services.systemDialog.open({
            type: 'app-update',
            context: {
                currentVersion: import.meta.env.BUILD_VERSION,
                latestVersion: updateInfo.version,
                systemInfo,
            },
        });
    } else {
        log.info('No update found');
    }
}

// Creates the application state and returns a destroy function to purge the app and its associated
// state from the DOM.
async function main(): Promise<() => void> {
    // Promise that resolves when the 'DOMContentLoaded' event happens
    const domContentLoaded = new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
            log.debug('DOM content has been loaded');
            resolve();
        });
    });

    // Promise that will be resolved when the identity is ready
    //
    // - When linking, this should be resolved when the user clicks the button in the success
    //   screen.
    // - When restoring an existing identity, this should be resolved when the backend could be
    //   initialized.
    const identityReady = new ResolvablePromise<void>({uncaught: 'default'});

    // Set up logging
    const consoleLogger = TagLogger.styled(DOM_CONSOLE_LOGGER, 'app', APP_CONFIG.LOG_DEFAULT_STYLE);
    const fileLogger = new RemoteFileLogger(window.app.logToFile);
    const logging = TeeLogger.factory([consoleLogger, TagLogger.unstyled(fileLogger, 'app')]);
    const log = logging.logger('main');
    initCrashReportingInSandboxBuilds(log);

    // Get system info
    const systemInfo = await window.app.getSystemInfo();
    log.info(`System info: os=${systemInfo.os} (${systemInfo.arch}), locale=${systemInfo.locale}`);

    // Instantiate global hotkeys manager
    const hotkeyManager = new GlobalHotkeyManager(logging.logger('hotkey-manager'), systemInfo, {
        setOnKeyDownHandler: (handler: (event: KeyboardEvent) => void) => {
            window.addEventListener('keydown', handler);
        },
    });

    // Instantiate global time keeper
    const systemTimeStore = new SystemTimeStore(logging.logger('system-time'));

    // Initialize app globals
    globals.set({
        // Note: It is important that this logger is initialized before we initialize the backend,
        // because the logger is used in components that are part of the linking process.
        uiLogging: logging,
        hotkeyManager,
        systemTime: systemTimeStore,
    });

    const elements: Elements = {
        splash: unwrap(document.body.querySelector<HTMLElement>('#splash')),
        container: unwrap(document.body.querySelector<HTMLElement>('#container')),
        systemDialogs: unwrap(document.body.querySelector<HTMLElement>('#dialogs')),
    };

    // Initialize local storage controller to ensure that theme selection is done when backend
    // controller is initialized
    const localStorageController = new LocalStorageController(
        [elements.container, elements.systemDialogs],
        systemInfo.locale,
    );

    await i18n.initialize({
        localeStore: localStorageController.locale,
        logging,
    });

    // Global error handlers
    function handleErrorEvent(event: ErrorEvent, prefix: string): void {
        const stacktrace =
            event.error instanceof Error ? extractErrorTraceback(event.error) : undefined;
        window.app.reportError({
            message: `${prefix}${event.message}`,
            location: {filename: event.filename, line: event.lineno},
            stacktrace,
        });
        if (stacktrace !== undefined) {
            log.error(stacktrace);
            event.preventDefault();
        }
    }
    self.addEventListener('error', (event: ErrorEvent) => {
        handleErrorEvent(event, 'Unhandled exception in app: ');
    });
    self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        const stacktrace =
            event.reason instanceof Error ? extractErrorTraceback(event.reason) : undefined;
        window.app.reportError({
            message: 'Unhandled promise rejection in app',
            stacktrace,
        });
        if (stacktrace !== undefined) {
            log.error(stacktrace);
            event.preventDefault();
        }
    });

    // Apply theme branding from build flavor
    applyThemeBranding(import.meta.env.BUILD_FLAVOR, elements.container);
    applyThemeBranding(import.meta.env.BUILD_FLAVOR, elements.systemDialogs);

    // Initialise WASM packages
    log.debug('Initializing WASM packages');
    await Promise.all([initComposeArea()]);

    // Track the app visibility state
    function handleAppVisibilityChange(): void {
        appVisibility.set(getAppVisibility());
    }
    document.addEventListener('visibilitychange', handleAppVisibilityChange);
    window.addEventListener('focus', handleAppVisibilityChange);
    window.addEventListener('blur', handleAppVisibilityChange);

    // Load the backend worker.
    //
    // IMPORTANT: This MUST be a template literal and reference `BUILD_TARGET` as we otherwise
    //            bundle incorrect variants. Note that other variables than
    //            `import.meta.env.BUILD_TARGET` are not supported!
    const workerUrl = new URL(
        `../worker/backend/${import.meta.env.BUILD_TARGET}/backend-worker.ts`,
        import.meta.url,
    );
    const worker = new Worker(workerUrl, {type: import.meta.env.DEBUG ? 'module' : 'classic'});

    // Forward unhandled errors in the worker to the main application
    worker.onerror = (event: ErrorEvent): void => {
        handleErrorEvent(event, 'Unhandled exception in worker: ');
    };
    log.info(`Worker ${workerUrl} created`);

    // Initialize the backend worker with the app path.
    //
    // Send app path to backend worker and wait for it to be ready.
    // Note: Comlink is not yet active at this point!
    const appPath = window.app.getAppPath();

    await new Promise((resolve) => {
        function readyListener(): void {
            worker.removeEventListener('message', readyListener);
            resolve(undefined);
        }
        worker.addEventListener('message', readyListener);
        worker.postMessage(appPath);
    });

    // Instantiate router
    const router = new Router(logging.logger('router'), {
        getUrlFragment: () => self.location.hash.substring(1),
        setUrlFragment: (fragment) => (self.location.hash = fragment),
        pushHistoryState: (state: RouterState, url?: string | URL) =>
            self.history.pushState(state, '', url),
        replaceHistoryState: (state: RouterState, url?: string | URL) =>
            self.history.replaceState(state, '', url),
        setOnPopStateHandler: (handler: (event: PopStateEvent) => void) => {
            self.onpopstate = handler;
        },
    });

    // Define function that will show the linking wizard
    async function showLinkingWizard(
        linkingState: ReadableStore<LinkingState>,
        userPassword: ResolvablePromise<string>,
        oppfConfig: ResolvablePromise<OppfConfig>,
    ): Promise<void> {
        await domContentLoaded;
        log.debug('Showing linking wizard');
        elements.splash.classList.add('hidden'); // Hide splash screen
        attachLinkingWizard(elements, {
            linkingState,
            userPassword,
            identityReady,
            oppfConfig,
        });
    }

    // Define function that will request user to enter the password for the key storage
    async function requestUserPassword(previouslyAttemptedPassword?: string): Promise<string> {
        await domContentLoaded;
        log.debug('Showing page to request password');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const passwordInput = attachPasswordInput(elements, previouslyAttemptedPassword);
        const password = await passwordInput.passwordPromise;
        elements.splash.classList.remove('hidden'); // Show splash screen
        return password;
    }

    // Initialize global dialog component
    const systemDialogsAppServices = new Delayed<AppServices>(
        () => new Error('App services for system dialogs not available'),
        () => new Error('App services for system dialogs already set'),
    );
    attachSystemDialogs(logging, elements.systemDialogs, systemDialogsAppServices);

    // Instantiate early services
    const frontendMediaService = new FrontendMediaService();
    const notification = new FrontendNotificationCreator();
    const systemDialog = new FrontendSystemDialogService();
    const endpoint = createEndpointService({logging}, STATIC_CONFIG);

    // Check for updates in the background, if this is an Electron release build.
    // Note: For now, we don't support custom update links provisioned by .oppf files.
    if (!import.meta.env.DEBUG) {
        updateCheck({logging, systemDialog}, STATIC_CONFIG, systemInfo).catch(assertUnreachable);
    }
    // Function to send new public key pins to the electron process
    function forwardPins(newPins: DomainCertificatePin[] | undefined): void {
        if (newPins !== undefined) {
            window.app.updatePublicKeyPins(newPins);
        }
    }
    log.info('Instantiating Backend');
    // Instantiate backend
    const [backend, isNewIdentity] = await BackendController.create(
        {
            frontendMediaService,
            notification,
            systemDialog,
        },
        systemInfo,
        {
            crypto: {randomBytes},
            endpoint,
            logging,
        },
        endpoint.wrap(worker, logging.logger('com.backend-creator')),
        showLinkingWizard,
        requestUserPassword,
        forwardPins,
    );
    const [
        profileSettings,
        appearanceSettings,
        privacySettings,
        devicesSettings,
        callsSettings,
        mediaSettings,
    ] = await Promise.all([
        backend.model.user.profileSettings,
        backend.model.user.appearanceSettings,
        backend.model.user.privacySettings,
        backend.model.user.devicesSettings,
        backend.model.user.callsSettings,
        backend.model.user.mediaSettings,
    ]);

    const settings: SettingsService = {
        profile: profileSettings,
        appearance: appearanceSettings,
        privacy: privacySettings,
        devices: devicesSettings,
        calls: callsSettings,
        media: mediaSettings,
    };
    // Create app services
    const services: AppServices = {
        crypto: {randomBytes},
        logging,
        blobCache: new BlobCacheService(backend, logging.logger('blob-cache')),
        profilePicture: new ProfilePictureService(backend, logging.logger('profile-picture')),
        storage: localStorageController,
        systemDialog,
        systemInfo,
        backend,
        router,
        settings,
    };
    systemDialogsAppServices.set(services);

    // We pass the blob cache to the thumbnail creator so that it can directly write into the cache
    frontendMediaService.setBlobCacheService(services.blobCache);

    // If this is an existing identity, resolve `identityReady` promise
    if (!isNewIdentity) {
        identityReady.resolve();
    }

    // Subscribe to unread message count changes and update all counters.
    function updateUnreadMessageAppBadge(count: u53 | undefined): void {
        let title = import.meta.env.APP_NAME;
        if (count === undefined || count < 1) {
            // Do not append anything to the title
        } else if (count > 99) {
            title += ' (99+)';
        } else {
            title += ` (${count})`;
        }
        document.title = title;
        window.app.updateAppBadge(count ?? 0);
    }
    const totalUnreadMessageCountUnsubscriber = (
        await backend.model.conversations.totalUnreadMessageCount
    ).subscribe(TIMER.debounce(updateUnreadMessageAppBadge, 300));

    // Attach app when the identity is ready and DOM is loaded
    log.debug('Waiting for identity');
    await identityReady;
    log.debug('Waiting for DOM');
    await domContentLoaded;
    log.debug('Attaching app');
    const app = attachApp(services, elements);

    // Return a destructor
    return () => {
        totalUnreadMessageCountUnsubscriber();
        app.$destroy();
    };
}

main().catch((error) => {
    throw new Error(`Critical error while initializing app`, {cause: error});
});
