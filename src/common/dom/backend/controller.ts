import type {ServicesForBackendController} from '~/common/backend';
import type {DeviceIds} from '~/common/device';
import {
    BackendCreationError,
    type BackendCreator,
    type BackendHandle,
    type BackendInitAfterTransfer,
    type DeviceLinkingSetup,
    type LinkingState,
} from '~/common/dom/backend';
import type {DebugBackend} from '~/common/dom/debug';
import type {SafeCredentials} from '~/common/dom/safe';
import type {SystemInfo} from '~/common/electron-ipc';
import type {D2mLeaderState} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import type {KeyStorage} from '~/common/key-storage';
import type {Logger} from '~/common/logging';
import type {ThumbnailGenerator} from '~/common/media';
import type {ProfilePictureView, Repositories} from '~/common/model';
import type {DisplayPacket} from '~/common/network/protocol/capture';
import type {ConnectionManagerHandle} from '~/common/network/protocol/connection';
import type {DirectoryBackend} from '~/common/network/protocol/directory';
import type {ConnectionState} from '~/common/network/protocol/state';
import type {IdentityString} from '~/common/network/types';
import type {NotificationCreator} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import {assertError, ensureError, unreachable} from '~/common/utils/assert';
import {
    type EndpointFor,
    PROXY_HANDLER,
    RELEASE_PROXY,
    type Remote,
    type RemoteProxy,
    TRANSFER_HANDLER,
    type TransferredToRemote,
} from '~/common/utils/endpoint';
import {eternalPromise} from '~/common/utils/promise';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {
    DeprecatedDerivedStore,
    type IQueryableStore,
    type ReadableStore,
    type RemoteStore,
    WritableStore,
} from '~/common/utils/store';
import type {IViewModelRepository} from '~/common/viewmodel';

export interface UserData {
    readonly identity: IdentityString;
    readonly displayName: RemoteStore<string>;
    readonly profilePicture: RemoteStore<ProfilePictureView>;
}

/**
 * Essential data required to be available for startup (of the UI).
 */
interface EssentialStartupData {
    readonly connectionState: RemoteStore<ConnectionState>;
    readonly leaderState: RemoteStore<D2mLeaderState>;
    readonly user: UserData;
}

export type InitialBootstrapData = SafeCredentials & DeviceIds & {newPassword: string};

/**
 * The backend controller takes the remote backend handle and establishes the
 * communication link between worker and UI thread.
 *
 * The backend controller instance itself lives in the UI thread.
 */
export class BackendController {
    public readonly connectionState: EssentialStartupData['connectionState'];
    public readonly leaderState: EssentialStartupData['leaderState'];
    public readonly user: UserData;
    public readonly debug: Remote<DebugBackend>;
    public readonly connectionManager: Remote<ConnectionManagerHandle>;
    public readonly deviceIds: DeviceIds;
    public readonly directory: Remote<DirectoryBackend>;
    public readonly model: Remote<Repositories>;
    public readonly keyStorage: Remote<KeyStorage>;
    public readonly viewModel: Remote<IViewModelRepository>;
    public capturing?: {
        readonly packets: IQueryableStore<readonly DisplayPacket[]>;
        readonly stop: () => void;
    };

    public constructor(
        private readonly _services: ServicesForBackendController,
        private readonly _log: Logger,
        private readonly _remote: RemoteProxy<BackendHandle>,
        deviceIds: DeviceIds,
        data: EssentialStartupData,
    ) {
        this.connectionState = data.connectionState;
        this.leaderState = data.leaderState;
        this.user = data.user;
        this.debug = _remote.debug;
        this.deviceIds = deviceIds;
        this.connectionManager = _remote.connectionManager;
        this.directory = _remote.directory;
        this.model = _remote.model;
        this.keyStorage = _remote.keyStorage;
        this.viewModel = _remote.viewModel;
    }

    public static async create(
        init: {
            readonly notification: NotificationCreator;
            readonly systemDialog: SystemDialogService;
            readonly thumbnailGenerator: ThumbnailGenerator;
        },
        systemInfo: SystemInfo,
        services: ServicesForBackendController,
        creator: RemoteProxy<BackendCreator>,
        showLinkingWizard: (
            linkingState: ReadableStore<LinkingState>,
            userPassword: ResolvablePromise<string>,
        ) => Promise<void>,
        requestUserPassword: (previouslyAttemptedPassword?: string) => Promise<string>,
    ): Promise<[controller: BackendController, isNewIdentity: boolean]> {
        const {endpoint, logging} = services;
        const log = logging.logger('backend-controller');

        /**
         * Helper function to assemble a {@link BackendInit} object.
         */
        function assembleBackendInit(): BackendInitAfterTransfer {
            // Thumbnail Generator
            const {local: localThumbnailGeneratorEndpoint, remote: thumbnailGeneratorEndpoint} =
                endpoint.createEndpointPair<ThumbnailGenerator>();

            endpoint.exposeProxy(
                init.thumbnailGenerator,
                localThumbnailGeneratorEndpoint,
                logging.logger('com.thumbnail-generator'),
            );

            // Notifications
            const {local: localNotificationEndpoint, remote: notificationEndpoint} =
                endpoint.createEndpointPair<NotificationCreator>();
            endpoint.exposeProxy(
                init.notification,
                localNotificationEndpoint,
                logging.logger('com.notification'),
            );

            // System Dialog
            const {local: localSystemDialogEndpoint, remote: systemDialogEndpoint} =
                endpoint.createEndpointPair<SystemDialogService>();
            endpoint.exposeProxy(
                init.systemDialog,
                localSystemDialogEndpoint,
                logging.logger('com.system-dialog'),
            );

            // Transfer
            const result = {
                thumbnailGeneratorEndpoint,
                notificationEndpoint,
                systemDialogEndpoint,
                systemInfo,
            };
            return endpoint.transfer(result, [
                result.notificationEndpoint,
                result.systemDialogEndpoint,
                result.thumbnailGeneratorEndpoint,
            ]);
        }

        function assembleDeviceLinkingSetup(
            linkingStateStore: WritableStore<LinkingState>,
            userPassword: Promise<string>,
        ): TransferredToRemote<EndpointFor<DeviceLinkingSetup>> {
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
                [TRANSFER_HANDLER]: PROXY_HANDLER,
            };

            // Expose
            endpoint.exposeProxy(deviceLinkingSetup, local, logging.logger('com.device-linking'));

            // Transfer
            return endpoint.transfer(remote, [remote]);
        }

        // Create backend from existing key storage (if present)
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
                    );
                } catch (error) {
                    assertError(
                        error,
                        BackendCreationError,
                        'Backend creator threw an unexpected error',
                    );
                    const errorMessage = extractErrorMessage(ensureError(error), 'short');
                    switch (error.type) {
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

            // Store containing the backend's linking state
            const linkingStateStore = new WritableStore<LinkingState>({
                state: 'initializing',
            });

            // Show linking screen with QR code
            const userPassword = new ResolvablePromise<string>();
            await showLinkingWizard(linkingStateStore, userPassword);

            // Create backend through device join
            try {
                backendEndpoint = await creator.fromDeviceJoin(
                    assembleBackendInit(),
                    assembleDeviceLinkingSetup(linkingStateStore, userPassword),
                );
            } catch (error) {
                assertError(
                    error,
                    BackendCreationError,
                    'Backend creator threw an unexpected error',
                );
                switch (error.type) {
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
        const [connectionState, leaderState, identity, deviceIds, profilePicture, displayName] =
            await Promise.all([
                remote.connectionManager.state,
                remote.connectionManager.leaderState,
                remote.model.user.identity,
                remote.deviceIds,
                remote.model.user.profilePicture,
                remote.model.user.displayName,
            ]);

        // Done
        log.debug('Creating backend controller');
        const backend = new BackendController(services, log, remote, deviceIds, {
            connectionState,
            leaderState,
            user: {identity, profilePicture, displayName},
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

        // Push sequential packets into a bounded array.
        //
        // TODO(DESK-688): We should not use a plain array for the store as the comparison on each
        // pushed packet will likely lead to significant CPU cost.
        const packets: DisplayPacket[] = [];
        const store = new DeprecatedDerivedStore([await this._remote.capture()], ([[, packet]]) => {
            if (packet === undefined) {
                return packets;
            }
            packets.push(packet);
            if (packets.length > this._services.config.DEBUG_PACKET_CAPTURE_HISTORY_LENGTH) {
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

    /**
     * Self-kick device from mediator server.
     */
    public async selfKickFromMediator(): Promise<void> {
        await this._remote.selfKickFromMediator();
    }
}
