import '../sass/app.scss';
import '../tailwind/index.css';

import initComposeArea from '@threema/compose-area/web';
import {Delayed} from '@threema/ts-utils/delayed/delayed';
import {ResettableDelayed} from '@threema/ts-utils/delayed/resettable-delayed';
import type {u53} from '@threema/ts-utils/integer/u53';
import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import {mount, unmount} from 'svelte';

import {APP_CONFIG} from '~/app/config';
import {globals} from '~/app/globals';
import {Router, type RouterState} from '~/app/routing/router';
import type {AppServices} from '~/app/types';
import App from '~/app/ui/App.svelte';
import PasswordInput from '~/app/ui/PasswordInput.svelte';
import LoadingScreen from '~/app/ui/components/partials/loading-screen/LoadingScreen.svelte';
import KeyStorageMigrationFailedModal from '~/app/ui/components/partials/modals/key-storage-migration-failed-modal/KeyStorageMigrationFailedModal.svelte';
import MissingCachedOnPremConfigModal from '~/app/ui/components/partials/modals/missing-cached-onprem-config-modal/MissingCachedOnPremConfigModal.svelte';
import MissingWorkCredentialsModal from '~/app/ui/components/partials/modals/missing-work-credentials-modal/MissingWorkCredentialsModal.svelte';
import {attachSystemDialogs} from '~/app/ui/components/partials/system-dialog/helpers';
import InvalidCertificatePinsDialog from '~/app/ui/components/partials/system-dialog/internal/invalid-certificate-pins-dialog/InvalidCertificatePinsDialog.svelte';
import {GlobalHotkeyManager} from '~/app/ui/hotkey';
import * as i18n from '~/app/ui/i18n';
import type {LinkingParams, OppfConfig} from '~/app/ui/linking';
import LinkingWizard from '~/app/ui/linking/LinkingWizard.svelte';
import {SystemTimeStore} from '~/app/ui/time';
import type {ServicesForBackendController} from '~/common/backend';
import type {
    LoadingState,
    LinkingState,
    CertificatePinRecoveryHandle,
    BackendCreationError,
} from '~/common/dom/backend';
import {BackendController} from '~/common/dom/backend/controller';
import {randomBytes} from '~/common/dom/crypto/random';
import {ElectronIpcService} from '~/common/dom/electron-service';
import {DOM_CONSOLE_LOGGER} from '~/common/dom/logging';
import {EmojiService} from '~/common/dom/ui/emoji-service';
import {LocalStorageController} from '~/common/dom/ui/local-storage';
import {FrontendMediaService} from '~/common/dom/ui/media';
import {FrontendNotificationCreator} from '~/common/dom/ui/notification';
import {ProfilePictureService} from '~/common/dom/ui/profile-picture';
import {SettingsService} from '~/common/dom/ui/settings';
import {appVisibility, getAppVisibility} from '~/common/dom/ui/state';
import {FrontendSystemDialogService} from '~/common/dom/ui/system-dialog';
import {applyThemeBranding} from '~/common/dom/ui/theme';
import {ThumbnailCacheService} from '~/common/dom/ui/thumbnail-cache';
import {initCrashReportingInSandboxBuilds} from '~/common/dom/utils/crash-reporting';
import {createEndpointService, ensureEndpoint} from '~/common/dom/utils/endpoint';
import {WebRtcServiceProvider} from '~/common/dom/webrtc';
import {initRtcStats, type RtcStatsHandle} from '~/common/dom/webrtc/rtcstats';
import type {SystemInfo} from '~/common/electron-ipc';
import {CallStatisticsPolicy} from '~/common/enum';
import {extractErrorTraceback} from '~/common/error';
import {CONSOLE_LOGGER, RemoteFileLogger, TagLogger, TeeLogger} from '~/common/logging';
import type {IGlobalPropertyModel} from '~/common/model/types/settings';
import type {ModelStore} from '~/common/model/utils/model-store';
import {DEFAULT_CATEGORY} from '~/common/settings';
import {parseTestData, type TestDataJson} from '~/common/test-data';
import {assertUnreachable, setAssertFailLogger, unwrap} from '~/common/utils/assert';
import type {Remote, RemoteProxy} from '~/common/utils/endpoint';
import type {ReusablePromise} from '~/common/utils/promise';
import {type ReadableStore, WritableStore, type IQueryableStore} from '~/common/utils/store';

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
): ReturnType<typeof LoadingScreen> {
    elements.container.innerHTML = '';
    return mount(LoadingScreen, {
        target: elements.container,
        props: {
            loadingState,
        },
    });
}

/**
 * Attach linking wizard.
 */
function attachLinkingWizard(
    elements: Elements,
    params: LinkingParams,
    electron: ElectronIpcService,
): ReturnType<typeof LinkingWizard> {
    elements.container.innerHTML = '';
    return mount(LinkingWizard, {
        target: elements.container,
        props: {
            services: {electron},
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
    electron: ElectronIpcService,
    previouslyAttemptedPassword?: string,
): ReturnType<typeof PasswordInput> {
    elements.container.innerHTML = '';
    return mount(PasswordInput, {
        target: elements.container,
        props: {
            services: {electron},
            shouldStorePassword,
            systemInfo,
            previouslyAttemptedPassword,
        },
    });
}

/**
 * Show dialog to inform user about mismatches certificate pins and allow user to fallback to a different oppf.
 */
function attachInvalidCertificatePinsModal(
    elements: Elements,
    recoveryHandle: ResettableDelayed<RemoteProxy<CertificatePinRecoveryHandle>>,
    requestedPassword: string,
    backendCreationError?: BackendCreationError,
): ReturnType<typeof InvalidCertificatePinsDialog> {
    elements.container.innerHTML = '';
    return mount(InvalidCertificatePinsDialog, {
        target: elements.container,
        props: {
            recoveryHandle,
            requestedPassword,
            previouslyAttemptedPassword: undefined,
            backendCreationError,
        },
    });
}

/**
 * Show dialog to warn about missing Threema Work credentials.
 */
function attachMissingWorkCredentialsModal(
    elements: Elements,
    electron: ElectronIpcService,
): ReturnType<typeof MissingWorkCredentialsModal> {
    elements.container.innerHTML = '';
    return mount(MissingWorkCredentialsModal, {
        target: elements.container,
        props: {
            services: {electron},
        },
    });
}

/**
 * Show dialog to inform about failed key storage migration.
 */
function attachKeyStorageMigrationFailedModal(
    elements: Elements,
    electron: ElectronIpcService,
): ReturnType<typeof MissingWorkCredentialsModal> {
    elements.container.innerHTML = '';
    return mount(KeyStorageMigrationFailedModal, {
        target: elements.container,
        props: {
            services: {electron},
        },
    });
}

/**
 * Show dialog informing the user that the local key storage cannot be migrated and a re-link is
 * required.
 */
function attachMissingCachedOnPremConfigModal(
    elements: Elements,
    electron: ElectronIpcService,
): ReturnType<typeof MissingCachedOnPremConfigModal> {
    elements.container.innerHTML = '';
    return mount(MissingCachedOnPremConfigModal, {
        target: elements.container,
        props: {
            services: {electron},
        },
    });
}

/**
 * Attach app to DOM.
 */
function attachApp(services: AppServices, elements: Elements): object {
    const log = services.logging.logger('attach');

    // Hide splash screen and remove it entirely after 1s
    elements.splash.classList.add('hidden');
    TIMER.sleep(1000)
        .then(() => elements.splash.remove())
        .catch(assertUnreachable);

    // Create app
    elements.container.innerHTML = '';
    const app = mount(App, {
        target: elements.container,
        props: {
            services,
            applicationState: services.backend.model.globalProperties.getOrCreate(
                'applicationState',
                {},
            ) as Promise<Remote<ModelStore<IGlobalPropertyModel<'applicationState'>>>>,
        },
    });
    log.info('App started');
    return app;
}

// Creates the application state and returns a destroy function to purge the app and its associated
// state from the DOM.
async function main(): Promise<() => Promise<void>> {
    // Promise that resolves when the 'DOMContentLoaded' event happens
    const domContentLoaded = new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
            log.debug('DOM content has been loaded');
            resolve();
        });
    });

    const electron = new ElectronIpcService();

    // Promise that will be resolved when the identity is ready
    //
    // - When linking, this should be resolved when the user clicks the button in the success
    //   screen.
    // - When restoring an existing identity, this should be resolved when the backend could be
    //   initialized.
    const identityReady = new ResolvablePromise<void>({uncaught: 'default'});

    const appAttached = new ResolvablePromise<void>({uncaught: 'default'});

    // Set up logging
    const consoleLogger = TagLogger.styled(DOM_CONSOLE_LOGGER, 'app', APP_CONFIG.LOG_DEFAULT_STYLE);
    const fileLogger = new RemoteFileLogger(electron.frontendHandle.logToFile);
    const logging = TeeLogger.factory([consoleLogger, TagLogger.unstyled(fileLogger, 'app')]);
    const log = logging.logger('main');
    {
        const assertFailLogger = logging.logger('assert');
        setAssertFailLogger((error) => assertFailLogger.error(extractErrorTraceback(error)));
    }
    initCrashReportingInSandboxBuilds(log);

    // Get system info
    const systemInfo = await electron.getSystemInfo();
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

    // Set up WebRTC call statistics recording (rtcstats). When enabled, WebRTC API calls and stats
    // of Threema calls are recorded into a local IndexedDB and can be exported from the about
    // settings page. Nothing is ever sent anywhere automatically.
    //
    // Note: Whether recording is enabled is stored in the troubleshooting settings, which only
    // become available once the backend is ready, so the API wrappers are installed lazily (see
    // below, after the settings service is created) and stay installed (but muted) when the setting
    // is disabled again, until the next restart. This stable handle allows the
    // `WebRtcServiceProvider` to be constructed before that.
    let rtcStatsInstalled: RtcStatsHandle | undefined;
    const rtcStats: RtcStatsHandle = {
        startSession: (sessionId) => rtcStatsInstalled?.startSession(sessionId),
        trace: (event, peerConnectionId, data) =>
            rtcStatsInstalled?.trace(event, peerConnectionId, data),
        setEnabled: (enabled) => rtcStatsInstalled?.setEnabled(enabled),
    };

    // Initialize localization
    await i18n.initialize({
        localeStore: localStorageController.locale,
        logging,
    });

    // Initialize loading screen state
    const loadingStateStore = new WritableStore<LoadingState>({
        state: 'pending',
    });

    // Store state of possible invalid certificate public key pins.
    const invalidCertificatePinStore = new WritableStore<boolean>(false);

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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
        electron.reportError({
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
        electron.reportError({
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

    // Prevent the default behavior ("save link as") if a user ALT + clicks an anchor tag. This
    // would try to download the linked resource, which is a footgun when used in conjunction with
    // TLS certificate pinning.
    //
    // Note: Only the default action is cancelled, propagation is left intact.
    function suppressAltClickDefault(event: MouseEvent): void {
        if (!event.altKey) {
            return;
        }
        // Note: `event.target` is an `Element` for any actual click, but narrow instead of casting
        // so that a synthetic click dispatched on e.g. `document` cannot throw in here.
        const target = event.target;
        if (target instanceof Element && target.closest('a[href]') !== null) {
            log.debug('Suppressed ALT + click default action on anchor');
            event.preventDefault();
        }
    }
    document.addEventListener('click', suppressAltClickDefault, {capture: true});

    // Load the backend worker.
    //
    // IMPORTANT: This MUST be a template literal and reference `BUILD_TARGET` as we otherwise
    //            bundle incorrect variants.
    const worker = new Worker(
        new URL(
            // eslint-disable-next-line prefer-template
            '../worker/backend/' + import.meta.env.BUILD_TARGET + '/backend-worker.ts',
            import.meta.url,
        ),
        {
            name: 'Backend Worker',
            type: 'module',
        },
    );

    // Forward unhandled errors in the worker to the main application
    worker.onerror = (event: ErrorEvent): void => {
        handleErrorEvent(event, 'Unhandled exception in worker: ');
    };
    log.info(`Worker created`);

    // Initialize the backend worker with the app path.
    //
    // Send app path and the path of the latest old profile (if it exists) to backend worker and
    // wait for it to be ready.
    // Note: Comlink is not yet active at this point!
    const appPath = electron.getAppPath();
    const oldProfilePath = electron.getLatestProfilePath();

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
        attachLinkingWizard(
            elements,
            {
                linkingState,
                userPassword,
                shouldStorePassword,
                oldProfilePassword,
                continueWithoutRestoring,
                identityReady,
                oppfConfig,
                isSafeStorageAvailable: systemInfo.isSafeStorageAvailable,
                invalidCertificatePinStore,
            },
            electron,
        );
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
            electron,
            previouslyAttemptedPassword,
        );

        // ESLint's TypeScript parser doesn't use svelte2tsx's type resolution
        // for .svelte imports, so it falls back to any for Svelte component
        // exports accessed in .ts files.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await passwordInput.passwordPromise;
    }

    // Define function that will request user to enter the password for the key storage
    async function requestMissingWorkCredentialsModal(): Promise<void> {
        await domContentLoaded;
        log.debug('Showing page to request missing work credentials');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const dialog = attachMissingWorkCredentialsModal(elements, electron);
        await dialog.foreverPromise;
    }

    async function requestInvalidCredentialPinsModal(
        requestedPassword: string,
        waitForAppAttached: boolean,
        backendCreationError?: BackendCreationError,
    ): Promise<boolean> {
        await domContentLoaded;
        if (waitForAppAttached) {
            log.debug(
                'Waiting for app to be attached before showing invalid credential pins dialog',
            );
            await appAttached;
        }
        log.debug('Showing invalid credential pins dialog');

        elements.splash.classList.add('hidden');
        const invalidCredentials = attachInvalidCertificatePinsModal(
            elements,
            certificatePinRecoveryHandle,
            requestedPassword,
            backendCreationError,
        );

        // ESLint's TypeScript parser doesn't use svelte2tsx's type resolution
        // for .svelte imports, so it falls back to any for Svelte component
        // exports accessed in .ts files.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await invalidCredentials.completionPromise;
    }

    async function requestKeyStorageMigrationFailedModal(): Promise<void> {
        await domContentLoaded;
        log.debug('Showing page to inform of failed key storage migration');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const dialog = attachKeyStorageMigrationFailedModal(elements, electron);
        await dialog.foreverPromise;
    }

    async function requestMissingCachedOnPremConfigModal(): Promise<void> {
        await domContentLoaded;
        log.debug('Showing page to require key storage reset and re-linking');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const dialog = attachMissingCachedOnPremConfigModal(elements, electron);
        await dialog.foreverPromise;
    }

    // Initialize early services and global dialog component
    const appServices: Delayed<AppServices> = Delayed.simple('AppServices');
    const certificatePinRecoveryHandle = new ResettableDelayed<
        RemoteProxy<CertificatePinRecoveryHandle>
    >('CertificatePinRecoveryHandle');
    const endpoint = createEndpointService({logging});
    const systemDialogComponent = attachSystemDialogs(elements.systemDialogs, appServices);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const systemDialog = new FrontendSystemDialogService(systemDialogComponent.setProgress);
    const webRtc = new WebRtcServiceProvider({endpoint, logging}, rtcStats);
    const backendControllerServices: ServicesForBackendController = {
        electron: electron.frontendHandle,
        endpoint,
        logging,
        media: new FrontendMediaService(appServices),
        notification: new FrontendNotificationCreator(),
        systemDialog,
        systemInfo,
        webRtc,
    };

    // Register callback to open the screensharing picker system dialog.
    electron.registerOnPresentScreenSharingPickerCallback((sources) => {
        systemDialog.open({
            type: 'screen-sharing-picker',
            context: {
                sources,
                onselect: (sourceId: string) => electron.screenSharingSourceSelected(sourceId),
                ondismiss: () => electron.screenSharingSourceSelected(undefined),
            },
        });
    });

    // Parse test data if json file was provided via command line and BUILD_MODE is testing
    let testDataJson: TestDataJson | undefined = undefined;
    if (import.meta.env.BUILD_MODE === 'testing') {
        const testDataString = await electron.getTestData();
        testDataJson = testDataString !== undefined ? parseTestData(testDataString) : undefined;
    }

    // Load password from safeStorage
    const passwordForExistingKeyStorage = await electron.loadUserPassword();
    log.info('Instantiating Backend');
    // Instantiate backend
    const [backend, identityIsReady] = await BackendController.create(
        oldProfilePath,
        backendControllerServices,
        endpoint.wrap(ensureEndpoint(worker), logging.logger('com.backend-creator')),
        loadingStateStore,
        testDataJson,
        passwordForExistingKeyStorage,
        certificatePinRecoveryHandle,
        invalidCertificatePinStore,
        showLinkingWizard,
        requestUserPassword,
        async (password: string) => await electron.storeUserPassword(password),
        requestMissingWorkCredentialsModal,
        requestMissingCachedOnPremConfigModal,
        requestKeyStorageMigrationFailedModal,
        requestInvalidCredentialPinsModal,
    );

    electron.registerOnSuspendCallback(async () => {
        // If remote secret is activated, restart the app.
        await backend.onSystemSuspend();
    });

    const settings = await SettingsService.create(backend);
    const emojis = await EmojiService.create(logging.logger('emoji'), backend);

    // Install rtcstats call statistics recording (see `rtcStats` handle above) as soon as it is
    // enabled in the troubleshooting settings. The wrappers are installed at most once. Because
    // installation is async, every policy change is applied once installation completed (the `then`
    // callbacks run in subscription order, so the most recent policy wins).
    let rtcStatsInstall: Promise<void> | undefined;
    const rtcStatsUnsubscriber = settings.views.troubleshooting.subscribe(
        ({callStatisticsPolicy}) => {
            const enabled =
                callStatisticsPolicy === CallStatisticsPolicy.RECORD_LOCALLY &&
                import.meta.env.ALLOW_RTC_STATS_RECORDING;
            if (enabled) {
                rtcStatsInstall ??= initRtcStats(logging).then((handle) => {
                    rtcStatsInstalled = handle;
                });
            }
            rtcStatsInstall
                ?.then(() => rtcStatsInstalled?.setEnabled(enabled))
                .catch(assertUnreachable);
        },
    );

    // Create app services
    const services: AppServices = {
        crypto: {randomBytes},
        electron,
        logging,
        thumbnailCache: new ThumbnailCacheService(backend, logging.logger('thumbnail-cache')),
        profilePicture: new ProfilePictureService(backend, logging.logger('profile-picture')),
        storage: localStorageController,
        systemDialog,
        systemInfo,
        backend,
        router,
        settings,
        webRtc,
        emojis,
    };
    appServices.set(services);

    // If this identity is ready, resolve `identityReady` promise
    if (identityIsReady) {
        identityReady.resolve();
    }

    function routeToSettings(): void {
        // Don't route if we are currently in the settings to the the history is not polluted.
        if (services.router.get().main.id !== 'settings') {
            services.router.goToSettings({category: DEFAULT_CATEGORY});
        }
    }

    // On macOS, register the hotkey to route to the settings.
    if ((await electron.getSystemInfo()).os === 'macos') {
        hotkeyManager.registerHotkey({control: true, code: 'Comma'}, routeToSettings);
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
        electron.updateAppBadge(count ?? 0);
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
        log.debug(`Loading screen is still 'pending', loadingState force set to 'ready'`);
    }
    await loadingCompleted;
    log.debug('Attaching app');
    const app = attachApp(services, elements);
    appAttached.resolve();

    // Return a destructor
    return async () => {
        rtcStatsUnsubscriber();
        totalUnreadMessageCountUnsubscriber();
        if ((await electron.getSystemInfo()).os === 'macos') {
            hotkeyManager.unregisterHotkey(routeToSettings);
        }
        await unmount(app);
    };
}

// Temporarily set primitive assertion failed logger, then run main
setAssertFailLogger((error) => CONSOLE_LOGGER.error(extractErrorTraceback(error)));
main().catch((error: unknown) => {
    throw new Error('Critical error while initializing app', {cause: error});
});
