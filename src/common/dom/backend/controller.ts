import {type ServicesForBackendController} from '~/common/backend';
import {type DeviceIds} from '~/common/device';
import {
    BackendCreationError,
    type BackendHandle,
    type BackendInit,
    type DeviceLinkingSetup,
    type LinkingState,
} from '~/common/dom/backend';
import {type DebugBackend} from '~/common/dom/debug';
import {type SafeCredentials} from '~/common/dom/safe';
import {type D2mLeaderState} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type ProfilePictureView, type Repositories} from '~/common/model';
import {type DisplayPacket} from '~/common/network/protocol/capture';
import {type DirectoryBackend} from '~/common/network/protocol/directory';
import {type ConnectionState} from '~/common/network/protocol/state';
import {type IdentityString} from '~/common/network/types';
import {type NotificationCreator} from '~/common/notification';
import {type SystemDialogService} from '~/common/system-dialog';
import {assertError, ensureError, unreachable} from '~/common/utils/assert';
import {
    type EndpointFor,
    PROXY_HANDLER,
    RELEASE_PROXY,
    type Remote,
    type RemoteProxy,
    TRANSFER_MARKER,
} from '~/common/utils/endpoint';
import {eternalPromise} from '~/common/utils/promise';
import {
    DeprecatedDerivedStore,
    type IQueryableStore,
    type ReadableStore,
    type RemoteStore,
    WritableStore,
} from '~/common/utils/store';
import {type IViewModelRepository} from '~/common/viewmodel';

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

/**
 * Create an instance of the backend worker.
 *
 * @param init Data required for initialization
 * @param deviceLinkingSetup If specified, device rendezvous and join protocols will be run before
 *   the backend is initialized. Note that any pre-existing database will be deleted.
 * @returns An endpoint if the backend could be instantiated.
 * @throws {BackendCreationError} if something goes wrong (e.g. if no key)
 */
type BackendCreator = (
    init: BackendInit,
    deviceLinkingSetup?: EndpointFor<DeviceLinkingSetup>,
) => Promise<EndpointFor<BackendHandle>>;

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
    public readonly deviceIds: DeviceIds;
    public readonly directory: Remote<DirectoryBackend>;
    public readonly model: Remote<Repositories>;
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
        this.directory = _remote.directory;
        this.model = _remote.model;
        this.viewModel = _remote.viewModel;
    }

    public static async create(
        init: {
            readonly notification: NotificationCreator;
            readonly systemDialog: SystemDialogService;
        },
        services: ServicesForBackendController,
        creator: RemoteProxy<BackendCreator>,
        showLinkingWizard: (linkingEvents: ReadableStore<LinkingState>) => Promise<void>,
        requestUserPassword: (previouslyAttemptedPassword?: string) => Promise<string>,
    ): Promise<[controller: BackendController, isNewIdentity: boolean]> {
        const {endpoint, logging} = services;
        const log = logging.logger('backend-controller');

        /**
         * Helper function to assemble a {@link BackendInit} object.
         */
        function assembleBackendInit(keyStoragePassword: string | undefined): BackendInit {
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
                notificationEndpoint,
                systemDialogEndpoint,
                keyStoragePassword,
            };
            return endpoint.transfer(result, [
                result.notificationEndpoint,
                result.systemDialogEndpoint,
            ]);
        }

        function assembleDeviceLinkingSetup(
            linkingStateStore: WritableStore<LinkingState>,
        ): EndpointFor<DeviceLinkingSetup> {
            const {local, remote} = endpoint.createEndpointPair<DeviceLinkingSetup>();

            // Add transfer markers
            const deviceLinkingSetup: DeviceLinkingSetup = {
                linkingState: {
                    store: linkingStateStore,
                    updateState: (state: LinkingState) => {
                        linkingStateStore.set(state);
                    },
                    [TRANSFER_MARKER]: PROXY_HANDLER,
                },
                [TRANSFER_MARKER]: PROXY_HANDLER,
            };

            // Expose
            endpoint.exposeProxy(deviceLinkingSetup, local, logging.logger('com.device-linking'));

            // Transfer
            return endpoint.transfer(remote, [remote]);
        }

        // Create backend (initial attempt, assuming that an ID is already set up)
        log.debug('Waiting for remote backend to be created');
        let backendEndpoint;
        {
            const LEGACY_DEFAULT_PASSWORD = 'please-change-me-i-am-so-insecure'; // TODO(DESK-731)
            let passwordForExistingKeyStorage: string | undefined = undefined;
            // eslint-disable-next-line no-labels
            loopToCreateBackendWithKeyStorage: for (;;) {
                log.debug('Loop to create backend with existing key storage');
                try {
                    backendEndpoint = await creator(
                        // TODO(DESK-731): Remove the transitional logic involving LEGACY_DEFAULT_PASSWORD
                        assembleBackendInit(
                            passwordForExistingKeyStorage ?? LEGACY_DEFAULT_PASSWORD,
                        ),
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
                        case 'key-storage-error-missing-password':
                            // Backend cannot be created because key storage password is not provided.
                            // Ask the user for the password and try again.
                            log.debug(
                                'Backend could not be created, no key storage password provided',
                            );
                            passwordForExistingKeyStorage = await requestUserPassword(
                                passwordForExistingKeyStorage,
                            );
                            continue;
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
                // eslint-disable-next-line no-labels
                break loopToCreateBackendWithKeyStorage;
            }
        }

        // Determine whether this is a new identity. If it is, a welcome screen will be shown when
        // first launching Threema Desktop.
        const isNewIdentity = backendEndpoint === undefined;

        // If backend could not be created, that means that no identity was found. Initiate device
        // linking flow.
        let newKeyStoragePassword: string | undefined;
        // TODO(DESK-1038): Can we get rid of the loop?
        while (backendEndpoint === undefined) {
            // No identity is found
            log.debug('Starting device linking process');

            // Store containing the backend's linking state
            const linkingStateStore = new WritableStore<LinkingState>({
                state: 'initializing',
            });

            // Show linking screen with QR code
            await showLinkingWizard(linkingStateStore);

            newKeyStoragePassword = 'asdf'; // TODO(DESK-1038)

            // Retry backend creation
            try {
                backendEndpoint = await creator(
                    assembleBackendInit(newKeyStoragePassword),
                    assembleDeviceLinkingSetup(linkingStateStore),
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
                        await eternalPromise();
                        break;
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
                    case 'key-storage-error-missing-password':
                        throw new Error(
                            `Unexpected error type: ${error.type} (${extractErrorMessage(
                                error,
                                'short',
                            )})`,
                        );
                    case 'key-storage-error-wrong-password':
                        throw new Error(
                            `Unexpected error type: ${error.type} (${extractErrorMessage(
                                error,
                                'short',
                            )})`,
                        );
                    default:
                        unreachable(error.type);
                }
            }
        }

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
        const controller = new BackendController(services, log, remote, deviceIds, {
            connectionState,
            leaderState,
            user: {identity, profilePicture, displayName},
        });
        return [controller, isNewIdentity];
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
     * Toggle auto-reconnect. When auto-reconnect is turned off, the current connection will be
     * closed.
     */
    public async toggleAutoReconnect(): Promise<void> {
        await this._remote.connectionManager.toggleAutoReconnect();
    }

    /**
     * Self-kick device from mediator server.
     */
    public async selfKickFromMediator(): Promise<void> {
        await this._remote.selfKickFromMediator();
    }
}
