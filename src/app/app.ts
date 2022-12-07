import '../sass/app.scss';

import {default as initComposeArea} from '@threema/compose-area/web';

import {attachSystemDialogs} from '~/app/components/system-dialogs';
import {CONFIG} from '~/common/config';
import {type InitialBootstrapData, BackendController} from '~/common/dom/backend/controller';
import {randomBytes} from '~/common/dom/crypto/random';
import {type SafeCredentials} from '~/common/dom/safe';
import {LocalStorageController} from '~/common/dom/ui/local-storage';
import {FrontendNotificationCreator} from '~/common/dom/ui/notification';
import {appVisibility, getAppVisibility} from '~/common/dom/ui/state';
import {FrontendSystemDialogService} from '~/common/dom/ui/system-dialog';
import {applyThemeBranding} from '~/common/dom/ui/theme';
import {checkForUpdate} from '~/common/dom/update-check';
import {createEndpointService} from '~/common/dom/utils/endpoint';
import {type ElectronIpc} from '~/common/electron-ipc';
import {extractErrorTraceback} from '~/common/error';
import {CONSOLE_LOGGER, RemoteFileLogger, TagLogger, TeeLogger} from '~/common/logging';
import {type IdentityString} from '~/common/network/types';
import {type u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {GlobalTimer} from '~/common/utils/timer';

import {type BootstrapParams} from './components';
import App from './components/App.svelte';
import Bootstrap from './components/Bootstrap.svelte';
import PasswordInput from './components/PasswordInput.svelte';
import {APP_CONFIG} from './config';
import {type RouterState, Router} from './routing/router';
import {type AppServices} from './types';

// Extend global APIs
//
// TODO(WEBMD-684): Consider using comlink/endpoint for IPC communication
declare global {
    interface Window {
        readonly app?: ElectronIpc;
    }
}

export interface Elements {
    readonly splash: HTMLElement;
    readonly container: HTMLElement;
    readonly systemDialogs: HTMLElement;
}

/**
 * Show bootstrapping page.
 */
function attachBootstrapForLinking(elements: Elements, params: BootstrapParams): Bootstrap {
    // Show bootstrapping page
    elements.container.innerHTML = '';
    return new Bootstrap({
        target: elements.container,
        props: {
            params,
        },
    });
}

/**
 * Show bootstrapping page for password.
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
function attachApp(services: AppServices, isNewIdentity: boolean, elements: Elements): App {
    const log = services.logging.logger('attach');

    // Hide splash screen and remove it entirely after 1s
    elements.splash.classList.add('hidden');
    void services.timer.sleep(1000).then(() => elements.splash.remove());

    // Create app
    elements.container.innerHTML = '';
    const app = new App({
        target: elements.container,
        props: {
            isNewIdentity,
            services,
        },
    });
    log.info('App started', app);
    return app;
}

/**
 * Check for updates. If an update is available, show a dialog to the user.
 */
async function updateCheck(
    services: Pick<AppServices, 'config' | 'logging' | 'timer' | 'systemDialog'>,
    electronIpc: ElectronIpc,
): Promise<void> {
    const {config, logging, timer} = services;
    const log = logging.logger('update-check');
    log.info('Checking for updates...');

    // Get system info (if we're in an Electron build)
    const systemInfo = await electronIpc.getSystemInfo();

    // Check for updates. If update is found, notify user after a short delay.
    const updateInfo = await checkForUpdate(config, log, systemInfo);
    if (updateInfo !== undefined) {
        await timer.sleep(3000);
        log.info(`Update available: ${updateInfo.version}`);
        void services.systemDialog.open({
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

export async function main(): Promise<App> {
    // Set up logging
    let logging = TagLogger.styled(CONSOLE_LOGGER, 'app', APP_CONFIG.LOG_DEFAULT_STYLE);
    if (
        import.meta.env.BUILD_TARGET === 'electron' &&
        import.meta.env.BUILD_ENVIRONMENT === 'sandbox'
    ) {
        assert(window.app?.logToFile !== undefined, 'Expected Electron IPC to be available');
        const fileLogger = new RemoteFileLogger(window.app.logToFile);
        logging = TeeLogger.factory([logging, TagLogger.unstyled(fileLogger, 'app')]);
    }
    const log = logging.logger('main');

    // Promise that resolves when the 'DOMContentLoaded' event happens
    const domContentLoaded = new Promise<void>((resolve) => {
        document.addEventListener('DOMContentLoaded', () => {
            log.debug('DOM content has been loaded');
            resolve();
        });
    });

    // Global error handlers
    function handleErrorEvent(event: ErrorEvent, prefix: string): void {
        const stacktrace =
            event.error instanceof Error ? extractErrorTraceback(event.error) : undefined;
        window.app?.reportError({
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
        window.app?.reportError({
            message: 'Unhandled promise rejection in app',
            stacktrace,
        });
        if (stacktrace !== undefined) {
            log.error(stacktrace);
            event.preventDefault();
        }
    });

    const elements: Elements = {
        splash: unwrap(document.body.querySelector<HTMLElement>('#splash')),
        container: unwrap(document.body.querySelector<HTMLElement>('#container')),
        systemDialogs: unwrap(document.body.querySelector<HTMLElement>('#dialogs')),
    };

    // Apply theme branding from build variant
    applyThemeBranding(import.meta.env.BUILD_VARIANT, elements.container);
    applyThemeBranding(import.meta.env.BUILD_VARIANT, elements.systemDialogs);

    // Initialise WASM packages
    log.info('Initialising WASM packages');
    await initComposeArea();

    // Track the app visibility state
    function handleAppVisibilityChange(): void {
        appVisibility.set(getAppVisibility());
    }
    document.addEventListener('visibilitychange', handleAppVisibilityChange);
    window.addEventListener('focus', handleAppVisibilityChange);
    window.addEventListener('blur', handleAppVisibilityChange);

    // Attempt to load the service worker.
    //
    // Note: For now, we don't load the service worker in Electron but we may need it in the future.
    //       There were some crashes in the past, see:
    //       https://github.com/electron/electron/issues/24715
    if (typeof self.ServiceWorker !== 'undefined' && import.meta.env.BUILD_TARGET !== 'electron') {
        // Install service worker.
        //
        // IMPORTANT: This MUST be a template literal and reference `BUILD_TARGET` as we otherwise
        //            bundle incorrect variants. Note that other variables than
        //            `import.meta.env.BUILD_TARGET` are not supported!
        const serviceWorkerUrl = new URL(
            `../service-worker-${import.meta.env.BUILD_TARGET}.ts`,
            import.meta.url,
        );
        try {
            const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
                type: import.meta.env.DEBUG ? 'module' : 'classic',
                scope: `./`,
            });
            log.info(
                `Service Worker ${serviceWorkerUrl} ` +
                    `registered for scope ${registration.scope}, waiting for controller...`,
            );

            // Wait for the controller to become available
            const controller = await new Promise<ServiceWorker>((resolve, reject) => {
                if (navigator.serviceWorker.controller !== null) {
                    resolve(navigator.serviceWorker.controller);
                    return;
                }
                navigator.serviceWorker.oncontrollerchange = (): void => {
                    navigator.serviceWorker.oncontrollerchange = null;
                    if (navigator.serviceWorker.controller === null) {
                        reject(new Error('Service worker controller unavailable'));
                    } else {
                        resolve(navigator.serviceWorker.controller);
                    }
                };
            });
            log.info(`Service worker controller established, state: ${controller.state}`);

            // TODO(WEBMD-685): Do handshake to ensure the service worker version is compatible with
            // our app version
            controller.postMessage('TODO(WEBMD-685)');
        } catch (error) {
            log.error('Could not register service worker', error);
        }
    } else {
        log.warn('Environment does not provide a service worker');
    }

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

    // For Electron, we must initialise the backend worker with the app path.
    if (import.meta.env.BUILD_TARGET === 'electron') {
        const appPath = window.app?.getAppPath();
        assert(appPath !== undefined, 'Expected Electron IPC to be available');
        // Send app path to backend worker and wait for it to be ready.
        // Note: Comlink is not yet active at this point!
        await new Promise((resolve) => {
            function readyListener(): void {
                worker.removeEventListener('message', readyListener);
                resolve(undefined);
            }
            worker.addEventListener('message', readyListener);
            worker.postMessage(appPath);
        });
    }

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

    // Define function that will request user to enter Threema Safe credentials
    async function requestSafeCredentials(
        isIdentityValid: (identity: IdentityString) => Promise<boolean>,
        isSafeBackupAvailable: (safeCredentials: SafeCredentials) => Promise<boolean>,
        currentIdentity?: IdentityString,
        error?: {
            message: string;
            details: string;
        },
    ): Promise<InitialBootstrapData> {
        await domContentLoaded;
        log.debug('Showing bootstrapping page');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const bootstrap = attachBootstrapForLinking(elements, {
            isIdentityValid,
            isSafeBackupAvailable,
            error,
            currentIdentity,
        });
        const credentials = await bootstrap.initialBootstrapData;
        elements.splash.classList.remove('hidden'); // Show splash screen
        return credentials;
    }

    // Define function that will request user to enter the password for the key storage
    async function requestUserPassword(previouslyAttemptedPassword?: string): Promise<string> {
        await domContentLoaded;
        log.debug('Showing page to request password');
        elements.splash.classList.add('hidden'); // Hide splash screen
        const bootstrap = attachPasswordInput(elements, previouslyAttemptedPassword);
        const password = await bootstrap.passwordPromise;
        elements.splash.classList.remove('hidden'); // Show splash screen
        return password;
    }

    // Initialize local storage controller to ensure that theme selection is done when backend
    // controller is initialized
    const localStorageController = new LocalStorageController([
        elements.container,
        elements.systemDialogs,
    ]);

    // Initialize global dialog component
    attachSystemDialogs(CONFIG, logging, elements.systemDialogs);

    // Create services
    const timer = new GlobalTimer();
    const notification = new FrontendNotificationCreator();
    const systemDialog = new FrontendSystemDialogService();
    const endpoint = createEndpointService({config: CONFIG, logging});
    const [backend, isNewIdentity] = await BackendController.create(
        {
            notification,
            systemDialog,
        },
        {
            config: CONFIG,
            endpoint,
            logging,
            timer,
        },
        endpoint.wrap(worker, logging.logger('com.backend-creator')),
        requestSafeCredentials,
        requestUserPassword,
    );
    const services: AppServices = {
        config: CONFIG,
        crypto: {randomBytes},
        logging,
        timer,
        storage: localStorageController,
        systemDialog,
        backend,
        router,
    };

    // Check for updates in the background, if this is an Electron release build
    if (!import.meta.env.DEBUG && window.app !== undefined) {
        void updateCheck(services, window.app);
    }

    function updateUnreadMessageAppBadge(count: u53 | undefined): void {
        const ipc = window.app;
        switch (import.meta.env.BUILD_TARGET) {
            case 'electron':
                assert(ipc !== undefined);
                ipc.updateAppBadge(count ?? 0);
                break;
            case 'web':
                // TODO(WEBMD-XXX): Consider updating the HTML title of the page.
                break;
            default:
                unreachable(import.meta.env.BUILD_TARGET);
        }
    }

    totalUnreadMessageCountStore = await backend.model.conversations.totalUnreadMessageCount;
    totalUnreadMessageCountStore.subscribe(updateUnreadMessageAppBadge);

    // Attach app when DOM is loaded
    await domContentLoaded;
    log.debug('Attaching app');
    return attachApp(services, isNewIdentity, elements);
}

let totalUnreadMessageCountStore;

export const app = main();
