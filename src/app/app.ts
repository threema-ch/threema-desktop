import '../sass/app.scss';

import initComposeArea from '@threema/compose-area/web';

import {APP_CONFIG} from '~/app/config';
import {globals} from '~/app/globals';
import {Router, type RouterState} from '~/app/routing/router';
import type {AppServices} from '~/app/types';
import App from '~/app/ui/App.svelte';
import PasswordInput from '~/app/ui/PasswordInput.svelte';
import LoadingScreen from '~/app/ui/components/partials/loading-screen/LoadingScreen.svelte';
import MissingWorkCredentialsModal from '~/app/ui/components/partials/modals/missing-work-credentials-modal/MissingWorkCredentialsModal.svelte';
import {attachSystemDialogs} from '~/app/ui/components/partials/system-dialog/helpers';
import {GlobalHotkeyManager} from '~/app/ui/hotkey';
import * as i18n from '~/app/ui/i18n';
import type {LinkingParams, OppfConfig} from '~/app/ui/linking';
import LinkingWizard from '~/app/ui/linking/LinkingWizard.svelte';
import {SystemTimeStore} from '~/app/ui/time';
import type {ServicesForBackendController} from '~/common/backend';
import type {LoadingState, LinkingState} from '~/common/dom/backend';
import {BackendController} from '~/common/dom/backend/controller';
import {randomBytes} from '~/common/dom/crypto/random';
import {FrontendLauncherService} from '~/common/dom/launcher';
import {DOM_CONSOLE_LOGGER} from '~/common/dom/logging';
import {BlobCacheService} from '~/common/dom/ui/blob-cache';
import {LocalStorageController} from '~/common/dom/ui/local-storage';
import {FrontendMediaService} from '~/common/dom/ui/media';
import {FrontendNotificationCreator} from '~/common/dom/ui/notification';
import {ProfilePictureService} from '~/common/dom/ui/profile-picture';
import {appVisibility, getAppVisibility} from '~/common/dom/ui/state';
import {FrontendSystemDialogService} from '~/common/dom/ui/system-dialog';
import {applyThemeBranding} from '~/common/dom/ui/theme';
import {initCrashReportingInSandboxBuilds} from '~/common/dom/utils/crash-reporting';
import {createEndpointService, ensureEndpoint} from '~/common/dom/utils/endpoint';
import {WebRtcServiceProvider} from '~/common/dom/webrtc';
import type {ElectronIpc, SystemInfo} from '~/common/electron-ipc';
import {extractErrorTraceback} from '~/common/error';
import {CONSOLE_LOGGER, RemoteFileLogger, TagLogger, TeeLogger} from '~/common/logging';
import type {SettingsService} from '~/common/model/types/settings';
import {parseTestData, type TestDataJson} from '~/common/test-data';
import type {DomainCertificatePin, u53} from '~/common/types';
import {assertUnreachable, setAssertFailLogger, unwrap} from '~/common/utils/assert';
import {Delayed} from '~/common/utils/delayed';
import type {ReusablePromise} from '~/common/utils/promise';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {WritableStore, type IQueryableStore, type ReadableStore} from '~/common/utils/store';
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
 * Attach loading screen.
 */
function attachLoadingScreen(
    elements: Elements,
    loadingState: IQueryableStore<LoadingState>,
): LoadingScreen {
    elements.container.innerHTML = '';
    return new LoadingScreen({
        target: elements.container,
        props: {
            loadingState,
        },
    });
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
    shouldStorePassword: ResolvablePromise<boolean>,
    systemInfo: SystemInfo,
    previouslyAttemptedPassword?: string,
): PasswordInput {
    elements.container.innerHTML = '';
    return new PasswordInput({
        target: elements.container,
        props: {
            shouldStorePassword,
            systemInfo,
            previouslyAttemptedPassword,
        },
    });
}

/**
 * Show dialog to warn about missing Threema Work credentials.
 */
function attachMissingWorkCredentialsModal(elements: Elements): MissingWorkCredentialsModal {
    elements.container.innerHTML = '';
    return new MissingWorkCredentialsModal({
        target: elements.container,
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
    {
        const assertFailLogger = logging.logger('assert');
        setAssertFailLogger((error) => assertFailLogger.error(extractErrorTraceback(error)));
    }
    initCrashReportingInSandboxBuilds(log);

    // Get system info
    const systemInfo = await window.app.getSystemInfo();
    log.info(
        `System info: os=${systemInfo.os} (${systemInfo.arch}), locale=${systemInfo.locale}, isSafeStorageAvailable=${systemInfo.isSafeStorageAvailable}`,
    );

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

    // Initialize localization
    await i18n.initialize({
        localeStore: localStorageController.locale,
        logging,
    });

    // Initialize loading screen state
    const loadingStateStore = new WritableStore<LoadingState>({
        state: 'pending',
    });
    // Needs to be resolved as soon as the backend is initialized, the message sync is completed,
    // and the loading screen has finished animating.
    const loadingCompleted = new ResolvablePromise<void, never>({uncaught: 'default'});
    const loadingStateStoreUnsubscriber = loadingStateStore.subscribe((value) => {
        if (value.state !== 'pending') {
            // If state switches to anything other than `"pending"`, the loading screen needs to be
            // displayed. Unsubscribe immediately, so this is only triggered once.
            loadingStateStoreUnsubscriber();

            domContentLoaded
                .then(async () => {
                    elements.splash.classList.add('hidden'); // Hide splash screen.
                    const loadingScreen = attachLoadingScreen(elements, loadingStateStore);

                    // Wait for the loading screen to finish.
                    return await Promise.race([
                        loadingScreen.finishedLoading,
                        loadingScreen.cancelledLoading,
                    ]);
                })
                .then(() => {
                    // Loading is finished, so the `ResolveablePromise` can be resolved.
                    loadingCompleted.resolve();
                })
                .catch(assertUnreachable);
        }
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
    const worker = new Worker(workerUrl, {
        name: 'Backend Worker',
        type: import.meta.env.DEBUG ? 'module' : 'classic',
    });

    // Forward unhandled errors in the worker to the main application
    worker.onerror = (event: ErrorEvent): void => {
        handleErrorEvent(event, 'Unhandled exception in worker: ');
    };
    log.info(`Worker ${workerUrl} created`);

    // Initialize the backend worker with the app path.
    //
    // Send app path and the path of the latest old profile (if it exists) to backend worker and
    // wait for it to be ready.
    // Note: Comlink is not yet active at this point!
    const appPath = window.app.getAppPath();
    const oldProfilePath = window.app.getLatestProfilePath();

    await new Promise((resolve) => {
        function readyListener(): void {
            worker.removeEventListener('message', readyListener);
            resolve(undefined);
        }
        worker.addEventListener('message', readyListener);
        worker.postMessage({appPath, oldProfilePath});
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
        shouldStorePassword: ResolvablePromise<boolean>,
        oldProfilePassword: ReusablePromise<string | undefined>,
        continueWithoutRestoring: ResolvablePromise<void>,
        oppfConfig: ResolvablePromise<OppfConfig>,
    ): Promise<void> {
        await domContentLoaded;
        log.debug('Showing linking wizard');
        elements.splash.classList.add('hidden'); // Hide splash screen
        attachLinkingWizard(elements, {
            linkingState,
            userPassword,
            shouldStorePassword,
            oldProfilePassword,
            continueWithoutRestoring,
            identityReady,
            oppfConfig,
            isSafeStorageAvailable: systemInfo.isSafeStorageAvailable,
        });
    }

    // Define function that will request user to enter the password for the key storage
    async function requestUserPassword(
        shouldStorePassword: ResolvablePromise<boolean>,
        previouslyAttemptedPassword?: string,
    ): Promise<string> {
        await domContentLoaded;
        log.debug('Showing password request dialog');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const passwordInput = attachPasswordInput(
            elements,
            shouldStorePassword,
            systemInfo,
            previouslyAttemptedPassword,
        );

        return await passwordInput.passwordPromise;
    }

    // Define function that will request user to enter the password for the key storage
    async function requestMissingWorkCredentialsModal(): Promise<void> {
        await domContentLoaded;
        log.debug('Showing page to request missing work credentials');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const dialog = attachMissingWorkCredentialsModal(elements);
        await dialog.foreverPromise;
    }

    // Initialize early services and global dialog component
    const appServices: Delayed<AppServices> = Delayed.simple('AppServices');
    const endpoint = createEndpointService({logging});
    const launcher = new FrontendLauncherService(window.app);
    const systemDialogComponent = attachSystemDialogs(elements.systemDialogs, appServices);
    const systemDialog = new FrontendSystemDialogService(systemDialogComponent.setProgress);
    const webRtc = new WebRtcServiceProvider({endpoint, logging});
    const backendControllerServices: ServicesForBackendController = {
        endpoint,
        launcher,
        logging,
        media: new FrontendMediaService(appServices),
        notification: new FrontendNotificationCreator(),
        systemDialog,
        systemInfo,
        webRtc,
    };

    // Function to send new public key pins to the electron process
    function forwardPins(newPins: DomainCertificatePin[] | undefined): void {
        if (newPins !== undefined) {
            window.app.updatePublicKeyPins(newPins);
        }
    }

    // Function to delete all old profiles
    function removeOldProfiles(): void {
        window.app.removeOldProfiles();
    }

    // Parse test data if json file was provided via command line and BUILD_MODE is testing
    let testDataJson: TestDataJson | undefined = undefined;
    if (import.meta.env.BUILD_MODE === 'testing') {
        const testDataString = await window.app.getTestData();
        testDataJson = testDataString !== undefined ? parseTestData(testDataString) : undefined;
    }

    // Load password from safeStorage
    const passwordForExistingKeyStorage =
        import.meta.env.BUILD_ENVIRONMENT === 'sandbox'
            ? await window.app.loadUserPassword()
            : undefined;

    log.info('Instantiating Backend');
    // Instantiate backend
    const [backend, identityIsReady] = await BackendController.create(
        oldProfilePath,
        backendControllerServices,
        endpoint.wrap(ensureEndpoint(worker), logging.logger('com.backend-creator')),
        loadingStateStore,
        testDataJson,
        passwordForExistingKeyStorage,
        showLinkingWizard,
        requestUserPassword,
        window.app.storeUserPassword,
        removeOldProfiles,
        forwardPins,
        requestMissingWorkCredentialsModal,
    );

    const [
        appearanceSettings,
        callsSettings,
        chatSettings,
        devicesSettings,
        mediaSettings,
        privacySettings,
        profileSettings,
    ] = await Promise.all([
        backend.model.user.appearanceSettings,
        backend.model.user.callsSettings,
        backend.model.user.chatSettings,
        backend.model.user.devicesSettings,
        backend.model.user.mediaSettings,
        backend.model.user.privacySettings,
        backend.model.user.profileSettings,
    ]);

    const settings: SettingsService = {
        appearance: appearanceSettings,
        calls: callsSettings,
        chat: chatSettings,
        devices: devicesSettings,
        media: mediaSettings,
        privacy: privacySettings,
        profile: profileSettings,
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
        webRtc,
    };
    appServices.set(services);

    // If this identity is ready, resolve `identityReady` promise
    if (identityIsReady) {
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
    log.debug('Awaiting loading screen finish');
    if (loadingStateStore.get().state === 'pending') {
        // Loading screen is still `"pending"` (i.e., it was not used), so we just set it to
        // `"ready"` to close it.
        loadingStateStore.set({state: 'ready'});
    }
    await loadingCompleted;
    log.debug('Attaching app');
    const app = attachApp(services, elements);

    // Return a destructor
    return () => {
        totalUnreadMessageCountUnsubscriber();
        app.$destroy();
    };
}

// Temporarily set primitive assertion failed logger, then run main
setAssertFailLogger((error) => CONSOLE_LOGGER.error(extractErrorTraceback(error)));
main().catch((error: unknown) => {
    throw new Error('Critical error while initializing app', {cause: error});
});
