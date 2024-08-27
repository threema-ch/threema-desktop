import type {ServicesForBackendController} from '~/common/backend';
import {STATIC_CONFIG} from '~/common/config';
import type {DeviceIds} from '~/common/device';
import {
    BackendCreationError,
    type OppfFetchConfig,
    type BackendCreator,
    type DeviceLinkingSetup,
    type LinkingState,
    type PinForwarder,
    type BackendHandle,
    type OldProfileRemover,
    type BackendInit,
    type LoadingState,
    type LoadingScreenSetup,
} from '~/common/dom/backend';
import type {ConnectionState, D2mLeaderState} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import {RELEASE_PROXY, TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {IFrontendMediaService} from '~/common/media';
import type {ProfilePictureView} from '~/common/model';
import type {DisplayPacket} from '~/common/network/protocol/capture';
import type {IdentityString} from '~/common/network/types';
import type {NotificationCreator} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import {assertError, assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type RemoteProxy, type ProxyEndpoint} from '~/common/utils/endpoint';
import {ReusablePromise, eternalPromise} from '~/common/utils/promise';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {
    type IQueryableStore,
    type ReadableStore,
    type RemoteStore,
    WritableStore,
} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {WebRtcService} from '~/common/webrtc';

export interface UserData {
    readonly identity: IdentityString;
    readonly profilePicture: RemoteStore<ProfilePictureView>;
}

/**
 * Essential data required to be available for startup (of the UI).
 */
interface EssentialStartupData {
    readonly connectionState: RemoteStore<ConnectionState>;
    readonly deviceIds: DeviceIds;
    readonly leaderState: RemoteStore<D2mLeaderState>;
    readonly user: UserData;
}

/**
 * The backend controller takes the remote {@link BackendHandle} and establishes the
 * communication link between worker and UI thread.
 *
 * The backend controller instance itself lives in the UI thread.
 */
export class BackendController {
    public readonly connectionState: EssentialStartupData['connectionState'];
    public readonly deviceIds: EssentialStartupData['deviceIds'];
    public readonly leaderState: EssentialStartupData['leaderState'];
    public readonly user: EssentialStartupData['user'];

    public readonly connectionManager: RemoteProxy<BackendHandle>['connectionManager'];
    public readonly debug: RemoteProxy<BackendHandle>['debug'];
    public readonly directory: RemoteProxy<BackendHandle>['directory'];
    public readonly keyStorage: RemoteProxy<BackendHandle>['keyStorage'];
    public readonly model: RemoteProxy<BackendHandle>['model'];
    public readonly viewModel: RemoteProxy<BackendHandle>['viewModel'];
    public readonly work: RemoteProxy<BackendHandle>['work'];

    public capturing?: {
        readonly packets: IQueryableStore<readonly DisplayPacket[]>;
        readonly stop: () => void;
    };

    public constructor(
        private readonly _log: Logger,
        private readonly _remote: RemoteProxy<BackendHandle>,

        data: EssentialStartupData,
    ) {
        this.connectionState = data.connectionState;
        this.deviceIds = data.deviceIds;
        this.leaderState = data.leaderState;
        this.user = data.user;

        this.connectionManager = _remote.connectionManager;
        this.debug = _remote.debug;
        this.directory = _remote.directory;
        this.keyStorage = _remote.keyStorage;
        this.model = _remote.model;
        this.viewModel = _remote.viewModel;
        this.work = _remote.work;
    }

    public static async create(
        oldProfilePath: string | undefined,
        services: ServicesForBackendController,
        creator: RemoteProxy<BackendCreator>,
        showLinkingWizard: (
            linkingState: ReadableStore<LinkingState>,
            userPassword: ResolvablePromise<string>,
            oldProfilePassword: ReusablePromise<string | undefined>,
            continueWithoutRestoring: ResolvablePromise<void>,
            oppfConfig: ResolvablePromise<OppfFetchConfig>,
        ) => Promise<void>,
        requestUserPassword: (previouslyAttemptedPassword?: string) => Promise<string>,
        showLoadingScreen: (loadingState: IQueryableStore<LoadingState>) => Promise<void>,
        removeOldProfiles: () => void,
        forwardPins: PinForwarder['forward'],
        requestMissingWorkCredentialsModal: () => Promise<void>,
    ): Promise<[controller: BackendController, isNewIdentity: boolean]> {
        const {endpoint, logging} = services;
        const log = logging.logger('backend-controller');

        /**
         * Helper function to assemble a {@link BackendInit} object.
         */
        function assembleBackendInit(): BackendInit {
            // Media
            const {local: localMediaEndpoint, remote: mediaEndpoint} =
                endpoint.createEndpointPair<IFrontendMediaService>();
            endpoint.exposeProxy(services.media, localMediaEndpoint, logging.logger('com.media'));

            // Notifications
            const {local: localNotificationEndpoint, remote: notificationEndpoint} =
                endpoint.createEndpointPair<NotificationCreator>();
            endpoint.exposeProxy(
                services.notification,
                localNotificationEndpoint,
                logging.logger('com.notification'),
            );

            // System dialog
            const {local: localSystemDialogEndpoint, remote: systemDialogEndpoint} =
                endpoint.createEndpointPair<SystemDialogService>();
            endpoint.exposeProxy(
                services.systemDialog,
                localSystemDialogEndpoint,
                logging.logger('com.system-dialog'),
            );

            // WebRTC
            const {local: localWebRtcEndpoint, remote: webRtcEndpoint} =
                endpoint.createEndpointPair<WebRtcService>();
            endpoint.exposeProxy(
                services.webRtc,
                localWebRtcEndpoint,
                logging.logger('com.webrtc'),
            );

            // Transfer
            return endpoint.transfer(
                {
                    mediaEndpoint,
                    notificationEndpoint,
                    systemDialogEndpoint,
                    webRtcEndpoint,
                    systemInfo: services.systemInfo,
                },
                [mediaEndpoint, notificationEndpoint, systemDialogEndpoint, webRtcEndpoint],
            );
        }

        function assembleLoadingScreen(
            loadingStateStore: WritableStore<LoadingState>,
        ): ProxyEndpoint<LoadingScreenSetup> {
            const {local, remote} = endpoint.createEndpointPair<LoadingScreenSetup>();

            // Add transfer markers
            const loadingScreenSetup: LoadingScreenSetup = {
                loadingState: {
                    store: loadingStateStore,
                    updateState: (state: LoadingState) => {
                        loadingStateStore.set(state);
                    },
                    [TRANSFER_HANDLER]: PROXY_HANDLER,
                },
                [TRANSFER_HANDLER]: PROXY_HANDLER,
            };

            // Expose
            endpoint.exposeProxy(loadingScreenSetup, local, logging.logger('com.loading-screen'));

            // Transfer
            return endpoint.transfer(remote, [remote]);
        }

        function assembleDeviceLinkingSetup(
            linkingStateStore: WritableStore<LinkingState>,
            userPassword: Promise<string>,
            oldProfilePassword: ReusablePromise<string | undefined>,
            continueWithoutRestoring: Promise<void>,
            oppfConfig: Promise<OppfFetchConfig>,
        ): ProxyEndpoint<DeviceLinkingSetup> {
            const {local, remote} = endpoint.createEndpointPair<DeviceLinkingSetup>();

            // Add transfer markers
            const deviceLinkingSetup: DeviceLinkingSetup = {
                linkingState: {
                    store: linkingStateStore,
                    updateState: (state: LinkingState) => {
                        linkingStateStore.set(state);
                    },
                    [TRANSFER_HANDLER]: PROXY_HANDLER,
                },
                userPassword,
                oldProfilePassword,
                continueWithoutRestoring,
                oppfConfig,
                [TRANSFER_HANDLER]: PROXY_HANDLER,
            };

            // Expose
            endpoint.exposeProxy(deviceLinkingSetup, local, logging.logger('com.device-linking'));

            // Transfer
            return endpoint.transfer(remote, [remote]);
        }

        function assembleForwardPinCommunication(
            forwardPin: PinForwarder['forward'],
        ): ProxyEndpoint<PinForwarder> {
            const {local, remote} = endpoint.createEndpointPair<PinForwarder>();
            const forwardPinSetup: PinForwarder = {
                [TRANSFER_HANDLER]: PROXY_HANDLER,
                forward: forwardPin,
            };

            endpoint.exposeProxy(forwardPinSetup, local, logging.logger('com.forward-pins'));
            return endpoint.transfer(remote, [remote]);
        }

        function assembleRemoveOldProfileCommunication(
            removeOldProfile: OldProfileRemover['remove'],
        ): ProxyEndpoint<OldProfileRemover> {
            const {local, remote} = endpoint.createEndpointPair<OldProfileRemover>();
            const removeOldProfileSetup: OldProfileRemover = {
                [TRANSFER_HANDLER]: PROXY_HANDLER,
                remove: removeOldProfile,
            };

            endpoint.exposeProxy(
                removeOldProfileSetup,
                local,
                logging.logger('com.delete-profiles'),
            );
            return endpoint.transfer(remote, [remote]);
        }

        const loadingStateStore = new WritableStore<LoadingState>({
            state: 'pending',
        });
        // Needs to be resolved as soon as the backend is initialized, the message sync is
        // completed, and the loading screen has finished animating.
        const loadingCompleted = new ResolvablePromise<void, never>({uncaught: 'default'});
        const loadingStateStoreUnsubscriber = loadingStateStore.subscribe((value) => {
            // If state switches to `"initializing"`, we can be sure that the password was correct,
            // so we need to show the loading screen.
            if (value.state === 'initializing') {
                loadingStateStoreUnsubscriber();

                showLoadingScreen(loadingStateStore)
                    .then(() => loadingCompleted.resolve())
                    .catch(assertUnreachable);
            }
        });

        // Create backend from existing key storage (if present).
        log.debug('Waiting for remote backend to be created');
        const isNewIdentity = !(await creator.hasIdentity());
        let backendEndpoint;
        if (!isNewIdentity) {
            let passwordForExistingKeyStorage: string | undefined = await requestUserPassword();

            // eslint-disable-next-line no-labels
            loopToCreateBackendWithKeyStorage: for (;;) {
                log.debug('Loop to create backend with existing key storage');
                try {
                    backendEndpoint = await creator.fromKeyStorage(
                        assembleBackendInit(),
                        passwordForExistingKeyStorage,
                        assembleForwardPinCommunication(forwardPins),
                        assembleLoadingScreen(loadingStateStore),
                    );
                    await loadingCompleted;
                } catch (error) {
                    assertError(
                        error,
                        BackendCreationError,
                        'Backend creator threw an unexpected error',
                    );
                    const errorMessage = extractErrorMessage(ensureError(error), 'short');
                    switch (error.type) {
                        case 'onprem-configuration-error':
                            // Backend cannot be created because the OnPrem configuration was not correct.
                            // This includes lacking work credentials in the storage or a wrong signature.
                            // This will probably lead to relinking.
                            // TODO(DESK-1325)
                            throw new Error('OnPrem configuration error', {cause: error});
                        case 'no-identity':
                            // Backend cannot be created because no identity was found.
                            // Carry on, the device linking logic will happen below.
                            log.debug('Backend could not be created, no identity found');
                            // eslint-disable-next-line no-labels
                            break loopToCreateBackendWithKeyStorage;
                        case 'key-storage-error':
                            throw new Error(
                                `TODO(DESK-383): handle key storage error (${errorMessage})`,
                            );
                        case 'key-storage-error-wrong-password':
                            log.debug('Backend could not be created, wrong key storage password');
                            passwordForExistingKeyStorage = await requestUserPassword(
                                passwordForExistingKeyStorage,
                            );
                            continue;
                        case 'missing-work-credentials':
                            log.debug(
                                'Backend could not be created, no WorkData present in work build',
                            );

                            await requestMissingWorkCredentialsModal();

                            return assertUnreachable(
                                'Cannot continue linking process without work data',
                            );
                        case 'handled-linking-error':
                            throw new Error(
                                `Unexpected error type: ${error.type} (${errorMessage})`,
                            );
                        default:
                            unreachable(error.type);
                    }
                }
                break;
            }
        }

        // If backend could not be created, that means that no identity was found. Initiate device
        // linking flow.
        if (backendEndpoint === undefined) {
            log.debug('Starting device linking process');

            const shouldRestoreOldMessages = oldProfilePath !== undefined;
            // Store containing the backend's linking state
            const linkingStateStore = new WritableStore<LinkingState>({
                state: 'initializing',
            });

            // Note: `oppfConfig` will never resolve in non OnPrem builds.
            const oppfConfig = new ResolvablePromise<OppfFetchConfig>({uncaught: 'default'});
            const userPassword = new ResolvablePromise<string>({uncaught: 'default'});
            const oldProfilePassword = new ReusablePromise<string | undefined>();
            const continueWithoutRestoring = new ResolvablePromise<void>({uncaught: 'default'});
            // Show linking screen
            await showLinkingWizard(
                linkingStateStore,
                userPassword,
                oldProfilePassword,
                continueWithoutRestoring,
                oppfConfig,
            );
            // Create backend through device join
            try {
                backendEndpoint = await creator.fromDeviceJoin(
                    assembleBackendInit(),
                    assembleDeviceLinkingSetup(
                        linkingStateStore,
                        userPassword,
                        oldProfilePassword,
                        continueWithoutRestoring,
                        oppfConfig,
                    ),
                    assembleForwardPinCommunication(forwardPins),
                    assembleRemoveOldProfileCommunication(removeOldProfiles),
                    shouldRestoreOldMessages,
                );
            } catch (error) {
                assertError(
                    error,
                    BackendCreationError,
                    'Backend creator threw an unexpected error',
                );
                switch (error.type) {
                    case 'onprem-configuration-error':
                    case 'handled-linking-error':
                        log.warn(
                            'Encountered a linking error that is handled by the UI. Waiting for application restart.',
                        );
                        return unreachable(await eternalPromise());
                    case 'no-identity':
                        throw new Error(
                            `Unexpected error type: ${error.type} (${extractErrorMessage(
                                error,
                                'short',
                            )})`,
                        );
                    case 'key-storage-error':
                        throw new Error(
                            `TODO(DESK-383): handle key storage error (${extractErrorMessage(
                                error,
                                'short',
                            )}`,
                        );
                    case 'key-storage-error-wrong-password':
                        throw new Error(
                            `Unexpected error type: ${error.type} (${extractErrorMessage(
                                error,
                                'short',
                            )})`,
                        );
                    case 'missing-work-credentials':
                        throw new Error(
                            `Unexpected error type: ${error.type} (${extractErrorMessage(
                                error,
                                'short',
                            )})`,
                        );
                    default:
                        return unreachable(error.type);
                }
            }
        }

        // Wrap backend endpoint
        const remote = endpoint.wrap<BackendHandle>(backendEndpoint, logging.logger('com.backend'));

        // Release the one-shot backend creator
        creator[RELEASE_PROXY]();

        // Gather startup data
        log.debug('Waiting for startup data to be available');
        const [connectionState, leaderState, identity, deviceIds, profilePicture] =
            await Promise.all([
                remote.connectionManager.state,
                remote.connectionManager.leaderState,
                remote.model.user.identity,
                remote.deviceIds,
                remote.model.user.profilePicture,
            ]);
        // Done
        log.debug('Creating backend controller');
        const backend = new BackendController(log, remote, {
            deviceIds,
            connectionState,
            leaderState,
            user: {identity, profilePicture},
        });

        return [backend, isNewIdentity];
    }

    /**
     * Trigger capturing network packets to be displayed in the debug network tab.
     */
    public async capture(): Promise<void> {
        this._log.info('Starting to capture packets');

        // TODO(DESK-63): This functionality should be untangled and moved into the `DebugBackend`

        // Nothing to do if already capturing
        if (this.capturing !== undefined) {
            return;
        }

        const debugHistoryLenggth = STATIC_CONFIG.DEBUG_PACKET_CAPTURE_HISTORY_LENGTH;

        // Push sequential packets into a bounded array.
        //
        // TODO(DESK-688): We should not use a plain array for the store as the comparison on each
        // pushed packet will likely lead to significant CPU cost.
        const packets: DisplayPacket[] = [];
        const store = derive([await this._remote.capture()], ([{currentValue: packet}]) => {
            if (packet === undefined) {
                return packets;
            }
            packets.push(packet);
            if (packets.length > debugHistoryLenggth) {
                packets.shift();
            }
            // Note: We need to clone the `packets` array, so the diffing
            //       algorithm of Svelte works!
            return [...packets];
        });

        // Add a no-op subscriber so the packets are gathered before the
        // packets are being displayed.
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const unsubscribe = store.subscribe(() => {});
        this.capturing = {
            packets: store,
            stop: (): void => {
                unsubscribe();
                this.capturing = undefined;
            },
        };
    }
}
