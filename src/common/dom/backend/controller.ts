import {type ServicesForBackendController} from '~/common/backend';
import {type DeviceIds} from '~/common/device';
import {
    BackendCreationError,
    type BackendHandle,
    type BackendInit,
    type SafeCredentialsAndDeviceIds,
} from '~/common/dom/backend';
import {type DebugBackend} from '~/common/dom/debug';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {
    RendezvousConnection,
    type RendezvousProtocolSetup,
} from '~/common/dom/network/protocol/rendezvous';
import {isSafeBackupAvailable, type SafeCredentials} from '~/common/dom/safe';
import {ActivityState, type D2mLeaderState} from '~/common/enum';
import {extractErrorMessage, SafeError} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type ProfilePictureView, type Repositories} from '~/common/model';
import {type DisplayPacket} from '~/common/network/protocol/capture';
import {type DirectoryBackend} from '~/common/network/protocol/directory';
import {type ConnectionState} from '~/common/network/protocol/state';
import {type IdentityString} from '~/common/network/types';
import {randomRendezvousAuthenticationKey} from '~/common/network/types/keys';
import {type NotificationCreator} from '~/common/notification';
import {type SystemDialogService} from '~/common/system-dialog';
import {type ReadonlyUint8Array} from '~/common/types';
import {assertError, ensureError, unreachable} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {
    type EndpointFor,
    RELEASE_PROXY,
    type Remote,
    type RemoteProxy,
} from '~/common/utils/endpoint';
import {eternalPromise} from '~/common/utils/promise';
import {type QueryablePromise, ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser} from '~/common/utils/signal';
import {DeprecatedDerivedStore, type IQueryableStore, type RemoteStore} from '~/common/utils/store';
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
 * Test whether the {@link identity} is a valid identity (i.e. exists in the directory and is
 * not revoked).
 *
 * @throws {DirectoryError} if something went wrong during fetching of the data.
 */
async function isIdentityValid(
    directory: DirectoryBackend,
    identity: IdentityString,
): Promise<boolean> {
    const identityData = await directory.identity(identity);
    switch (identityData.state) {
        case ActivityState.ACTIVE:
        case ActivityState.INACTIVE:
            return true;
        case ActivityState.INVALID:
            return false;
        default:
            return unreachable(identityData);
    }
}

/**
 * Create an instance of the backend worker.
 *
 * @param init Data required for initialization
 * @param safeCredentialsAndDeviceIds If specified, this Safe backup will be restored before the
 *   backend is initialized. Note that any pre-existing database will be deleted.
 * @returns An endpoint if the backend could be instantiated.
 * @throws {BackendCreationError} if something goes wrong (e.g. if no key)
 */
type BackendCreator = (
    init: BackendInit,
    safeCredentialsAndDeviceIds?: SafeCredentialsAndDeviceIds,
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
        showLinkingWizard: (
            setup: RendezvousProtocolSetup,
            connected: QueryablePromise<void>,
            nominated: QueryablePromise<ReadonlyUint8Array>,
            onComplete: () => void,
        ) => Promise<void>,
        requestSafeCredentials: (
            isIdentityValid: (identity: IdentityString) => Promise<boolean>,
            isSafeBackupAvailable: (safeCredentials: SafeCredentials) => Promise<boolean>,
            currentIdentity?: IdentityString,
            error?: {
                message: string;
                details: string;
            },
        ) => Promise<InitialBootstrapData>,
        requestUserPassword: (previouslyAttemptedPassword?: string) => Promise<string>,
        showLinkingErrorDialog: (error: SafeError) => Promise<void>,
    ): Promise<[controller: BackendController, isNewIdentity: boolean]> {
        const {endpoint, logging} = services;
        const log = logging.logger('backend-controller');

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

        // Create backend
        log.debug('Waiting for remote backend to be created');
        let backendEndpoint;
        {
            const LEGACY_DEFAULT_PASSWORD = 'please-change-me-i-am-so-insecure';
            let passwordForExistingKeyStorage: string | undefined = undefined;
            // eslint-disable-next-line no-labels
            loopToCreateBackendWithKeyStorage: for (;;) {
                log.debug('Loop to create backend with key storage');
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
                            // Carry on, the bootstrapping logic will happen below.
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
                        case 'restore-failed':
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

        // If backend could not be created, that means that no identity was found.
        let bootstrapError;
        let currentIdentity: IdentityString | undefined;
        let newKeyStoragePassword: string | undefined;

        while (backendEndpoint === undefined) {
            // We need the directory backend to be able to validate the user's identity
            const directory = new FetchDirectoryBackend({config: services.config});

            // No identity is found. Thus, start rendezvous / device join protocols.
            log.debug('Starting device linking process');
            {
                const abort = new AbortRaiser();

                // Generate rendezvous setup with all information needed to show the QR code
                const rendezvousPath = bytesToHex(services.crypto.randomBytes(new Uint8Array(32)));
                const setup: RendezvousProtocolSetup = {
                    abort,
                    role: 'initiator',
                    ak: randomRendezvousAuthenticationKey(services.crypto),
                    relayedWebSocket: {
                        pathId: 1,
                        // TODO(DESK-1037): Move URL to config
                        url: `wss://rendezvous-${rendezvousPath.slice(
                            0,
                            1,
                        )}.test.threema.ch/${rendezvousPath.slice(0, 2)}/${rendezvousPath}`,
                    },
                };

                // This promise will be resolved as soon as the WebSocket connection is established.
                // If the connection fails, this promise will be rejected.
                const connected = new ResolvablePromise<void>();

                // This promise will be resolved with the Rendezvous Path Hash (RPH) as soon as the
                // connection is established (including path nomination).
                const nominated = new ResolvablePromise<ReadonlyUint8Array>();

                // Show linking screen with QR code
                await showLinkingWizard(setup, connected, nominated, () => {
                    // TODO(DESK-1037): What to do when the process is done?
                });

                // Create RendezvousConnection and open WebSocket connection
                let rendezvous;
                try {
                    rendezvous = await RendezvousConnection.create({logging}, setup);
                } catch (error) {
                    log.warn(`Rendezvous connection failed: ${error}`);
                    connected.reject(ensureError(error));
                    return await eternalPromise(); // TODO(DESK-1037)
                }
                connected.resolve();

                // Do the rendezvous handshake and wait for nomination of a path
                let connectResult;
                try {
                    connectResult = await rendezvous.connect();
                } catch (error) {
                    log.warn(`Rendezvous handshake failed: ${error}`);
                    nominated.reject(ensureError(error));
                    return await eternalPromise(); // TODO(DESK-1037)
                }
                log.info('Rendezvous connection established');
                nominated.resolve(connectResult.rph);

                await eternalPromise();
                // TODO(DESK-1037): connection.abort.raise();
            }

            const credentialsAndDeviceIds = await requestSafeCredentials(
                async (identity: IdentityString) => await isIdentityValid(directory, identity),
                async (safeCredentials: SafeCredentials) =>
                    await isSafeBackupAvailable(services, safeCredentials),
                currentIdentity,
                bootstrapError,
            );
            currentIdentity = credentialsAndDeviceIds.identity;
            const credentials: SafeCredentialsAndDeviceIds = {
                credentials: {
                    identity: credentialsAndDeviceIds.identity,
                    password: credentialsAndDeviceIds.password,
                    customSafeServer: credentialsAndDeviceIds.customSafeServer,
                },
                deviceIds: {
                    d2mDeviceId: credentialsAndDeviceIds.d2mDeviceId,
                    cspDeviceId: credentialsAndDeviceIds.cspDeviceId,
                },
            };
            newKeyStoragePassword = credentialsAndDeviceIds.newPassword;

            // Retry backend creation
            try {
                backendEndpoint = await creator(
                    assembleBackendInit(newKeyStoragePassword),
                    credentials,
                );
            } catch (error) {
                assertError(
                    error,
                    BackendCreationError,
                    'Backend creator threw an unexpected error',
                );
                switch (error.type) {
                    case 'restore-failed':
                        if (error.cause instanceof SafeError) {
                            await showLinkingErrorDialog(error.cause);
                        } else {
                            log.warn(extractErrorMessage(error, 'long'));
                            bootstrapError = {
                                message:
                                    'Linking failed. Are the identity and linking code correct?',
                                details: `${error.message}`,
                            };
                        }
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
