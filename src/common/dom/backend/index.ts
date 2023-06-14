import {type ServicesForBackend} from '~/common/backend';
import {type Compressor} from '~/common/compressor';
import {NACL_CONSTANTS, wrapRawKey} from '~/common/crypto';
import {SecureSharedBoxFactory, SharedBoxFactory} from '~/common/crypto/box';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {
    type DatabaseBackend,
    type RawDatabaseKey,
    type ServicesForDatabaseFactory,
} from '~/common/db';
import {DeviceBackend, type DeviceIds} from '~/common/device';
import {DeviceJoinProtocol} from '~/common/dom/backend/join';
import {randomBytes} from '~/common/dom/crypto/random';
import {DebugBackend} from '~/common/dom/debug';
import {FetchBlobBackend} from '~/common/dom/network/protocol/fetch-blob';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {applyMediatorStreamPipeline} from '~/common/dom/network/protocol/pipeline';
import {
    RendezvousConnection,
    type RendezvousProtocolSetup,
} from '~/common/dom/network/protocol/rendezvous';
import {MediatorWebSocketTransport} from '~/common/dom/network/transport/mediator-websocket';
import {type WebSocketEventWrapperStreamOptions} from '~/common/dom/network/transport/websocket';
import {type SafeBackupData, type SafeCredentials} from '~/common/dom/safe';
import {SafeContactImporter} from '~/common/dom/safe/safe-contact-importer';
import {SafeGroupImporter} from '~/common/dom/safe/safe-group-importer';
import {type BrowserInfo, getBrowserInfo} from '~/common/dom/utils/browser';
import {
    CloseCode,
    CloseCodeUtils,
    CspAuthStateUtils,
    D2mAuthStateUtils,
    D2mLeaderState,
    D2mLeaderStateUtils,
    GroupUserState,
    TransferTag,
} from '~/common/enum';
import {
    BaseError,
    type BaseErrorOptions,
    extractErrorMessage,
    extractErrorTraceback,
} from '~/common/error';
import {type FileStorage, type ServicesForFileStorageFactory} from '~/common/file-storage';
import {
    type KeyStorage,
    type KeyStorageContents,
    KeyStorageError,
    type ServicesForKeyStorageFactory,
} from '~/common/key-storage';
import {type Logger, type LoggerFactory} from '~/common/logging';
import {type ProfileSettingsView, type Repositories} from '~/common/model';
import {ModelRepositories} from '~/common/model/repositories';
import {type CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import {
    type DisplayPacket,
    type PacketMeta,
    RAW_CAPTURE_CONVERTER,
    type RawCaptureHandlers,
    type RawPacket,
} from '~/common/network/protocol/capture';
import {type ConnectionHandle, ProtocolController} from '~/common/network/protocol/controller';
import {type DirectoryBackend} from '~/common/network/protocol/directory';
import {
    ConnectionState,
    ConnectionStateUtils,
    CspAuthState,
    D2mAuthState,
} from '~/common/network/protocol/state';
import {OutgoingContactRequestProfilePictureTask} from '~/common/network/protocol/task/csp/outgoing-contact-request-profile-picture';
import {OutgoingGroupSyncRequestTask} from '~/common/network/protocol/task/csp/outgoing-group-sync-request';
import {DropDeviceTask} from '~/common/network/protocol/task/d2m/drop-device';
import {ConnectedTaskManager, TaskManager} from '~/common/network/protocol/task/manager';
import {
    ensureNickname,
    type IdentityString,
    isNickname,
    type ServerGroup,
} from '~/common/network/types';
import {
    type ClientKey,
    randomRendezvousAuthenticationKey,
    type RawDeviceGroupKey,
    type TemporaryClientKey,
} from '~/common/network/types/keys';
import {type NotificationCreator, NotificationService} from '~/common/notification';
import {type SystemDialogService} from '~/common/system-dialog';
import {type Mutable, type ReadonlyUint8Array} from '~/common/types';
import {
    assert,
    assertError,
    assertUnreachable,
    ensureError,
    unreachable,
} from '~/common/utils/assert';
import {bytesToHex, byteToHex} from '~/common/utils/byte';
import {Delayed} from '~/common/utils/delayed';
import {
    type EndpointFor,
    PROXY_HANDLER,
    type ProxyMarked,
    registerErrorTransferHandler,
    type Remote,
    TRANSFER_MARKER,
} from '~/common/utils/endpoint';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser} from '~/common/utils/signal';
import {
    type LocalStore,
    MonotonicEnumStore,
    type StoreDeactivator,
    type StrictMonotonicEnumStore,
    WritableStore,
} from '~/common/utils/store';
import {GlobalTimer} from '~/common/utils/timer';
import {type IViewModelRepository, ViewModelRepository} from '~/common/viewmodel';
import {ViewModelCache} from '~/common/viewmodel/cache';

/**
 * Type of the {@link BackendCreationError}.
 *
 * - no-identity: Identity cannot be found.
 * - handled-linking-error: An error happened during linking. The error was already propagated to
 *   the UI through the linking state, no further actions are needed.
 * - key-storage-error: An error related to the key storage occurred.
 */
export type BackendCreationErrorType =
    | 'no-identity'
    | 'handled-linking-error'
    | 'key-storage-error'
    | 'key-storage-error-missing-password'
    | 'key-storage-error-wrong-password';

const BACKEND_CREATION_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    BackendCreationError,
    TransferTag.BACKEND_CREATION_ERROR,
    [type: BackendCreationErrorType]
>({
    tag: TransferTag.BACKEND_CREATION_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new BackendCreationError(type, message, {from: cause}),
});

/**
 * Errors that can be thrown by the BackendCreator.
 */
export class BackendCreationError extends BaseError {
    public [TRANSFER_MARKER] = BACKEND_CREATION_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: BackendCreationErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/**
 * Data required to be supplied to a backend worker for initialisation.
 */
export interface BackendInit {
    readonly notificationEndpoint: EndpointFor<NotificationCreator>;
    readonly systemDialogEndpoint: EndpointFor<SystemDialogService>;
    readonly keyStoragePassword?: string;
}

/**
 * The backend handle exposes the core logic to the UI thread.
 */
export type BackendHandle = Pick<
    Backend,
    | 'capture'
    | 'connectionManager'
    | 'debug'
    | 'deviceIds'
    | 'directory'
    | 'model'
    | 'viewModel'
    | 'selfKickFromMediator'
>;

/**
 * Service factories needed for a backend worker.
 */
export interface FactoriesForBackend {
    readonly logging: (rootTag: string, defaultStyle: string) => LoggerFactory;
    readonly keyStorage: (services: ServicesForKeyStorageFactory, log: Logger) => KeyStorage;
    readonly fileStorage: (services: ServicesForFileStorageFactory, log: Logger) => FileStorage;
    readonly compressor: () => Compressor;
    readonly db: (
        services: ServicesForDatabaseFactory,
        log: Logger,
        key: RawDatabaseKey,
    ) => DatabaseBackend;
}

/**
 * Safe credentials and the associated device IDs.
 */
export interface SafeCredentialsAndDeviceIds {
    readonly credentials: SafeCredentials;
    readonly deviceIds: DeviceIds;
}

/**
 * Linking state error sub-types.
 *
 * - connection-error: Failed to connect to the rendezvous server (or the connection aborted).
 * - rendezvous-error: The rendezvous protocol did not succeed.
 * - join-error: The device join protocol did not succeed.
 * - generic-error: Some other error during linking.
 */
export type LinkingStateErrorType =
    | 'connection-error'
    | 'rendezvous-error'
    | 'join-error'
    | 'generic-error';

/**
 * The backend's linking state.
 */
export type LinkingState =
    /**
     * Initial state.
     */
    | {state: 'initializing'}
    /**
     * Rendezvous WebSocket connection is established.
     */
    | {state: 'waiting-for-handshake'; joinUri: string}
    /**
     * Rendezvous protocol is complete. The rendezvous path hash is included.
     */
    | {state: 'nominated'; rph: ReadonlyUint8Array}
    /**
     * The "Begin" join message was received, blobs and essential data are being processed.
     */
    | {state: 'syncing'}
    /**
     * Essential data is fully processed, we are waiting for the user's password in order to write
     * the key storage.
     */
    | {state: 'waiting-for-password'}
    /**
     * We are registered at the Mediator server and the device join protocol is complete.
     */
    | {state: 'registered'}
    /**
     * An error occurred, device join did not succeed.
     */
    | {
          state: 'error';
          type: LinkingStateErrorType;
          message: string;
      };

export interface DeviceLinkingSetup extends ProxyMarked {
    /**
     * State updates sent from the backend to the frontend.
     */
    readonly linkingState: {
        readonly store: WritableStore<LinkingState>;
        readonly updateState: (state: LinkingState) => void;
    } & ProxyMarked;
}

/**
 * The backend combines all required services and contains the core logic of our application.
 *
 * The backend lives in the worker thread. It is exposed via its {@link BackendHandle} to the UI
 * thread through the {@link BackendController}.
 */
export class Backend implements ProxyMarked {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly debug: DebugBackend;
    public readonly deviceIds: DeviceIds;
    public readonly directory: DirectoryBackend;
    public readonly model: Repositories;
    public readonly viewModel: IViewModelRepository;
    public readonly connectionManager: ConnectionManager;
    private readonly _log: Logger;
    private _capture?: RawCaptureHandlers;

    private constructor(private readonly _services: ServicesForBackend) {
        this._log = _services.logging.logger('backend');
        this.connectionManager = new ConnectionManager(_services, () => this._capture);
        this.debug = new DebugBackend(this._services, this);
        this.deviceIds = {
            cspDeviceId: _services.device.csp.deviceId,
            d2mDeviceId: _services.device.d2m.deviceId,
        };
        this.directory = _services.directory;
        this.model = _services.model;
        this.viewModel = _services.viewModel;
    }

    /**
     * Create an instance of the backend worker.
     *
     * @param init {BackendInit} Data required to be supplied to a backend worker for
     *   initialisation.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param safeCredentialsAndDeviceIds If specified, this Safe backup will be restored before the
     *   backend is initialized. Note that any pre-existing database will be deleted.
     * @returns A remote BackendHandle that can be used by the main thread to access the backend
     *   worker.
     */
    public static async create(
        {
            notificationEndpoint: notificationCreator,
            systemDialogEndpoint,
            keyStoragePassword,
        }: BackendInit,
        factories: FactoriesForBackend,
        {config, endpoint, logging}: Pick<ServicesForBackend, 'config' | 'endpoint' | 'logging'>,
        deviceLinkingSetup?: EndpointFor<DeviceLinkingSetup>,
    ): Promise<EndpointFor<BackendHandle>> {
        const log = logging.logger('backend.create');

        // Initialize services that are needed early
        const compressor = factories.compressor();
        const crypto = new TweetNaClBackend(randomBytes);
        const directory = new FetchDirectoryBackend({config});

        // Fields required to instantiate the backend
        let identityData:
            | {identity: IdentityString; ck: ClientKey; serverGroup: ServerGroup}
            | undefined;
        let dgk: RawDeviceGroupKey | undefined;
        let deviceIds: DeviceIds | undefined;

        // If the required setup information is passed in, start the device linking flow
        if (deviceLinkingSetup !== undefined) {
            log.info('Starting device linking flow');

            // Get access to linking setup information
            const wrappedDeviceLinkingSetup = endpoint.wrap<DeviceLinkingSetup>(
                deviceLinkingSetup,
                logging.logger('com.device-linking'),
            );
            const {linkingState} = wrappedDeviceLinkingSetup;

            // Generate rendezvous setup with all information needed to show the QR code
            let setup: RendezvousProtocolSetup;
            {
                const rendezvousPath = bytesToHex(crypto.randomBytes(new Uint8Array(32)));
                const url = config.RENDEZVOUS_SERVER_URL.replaceAll(
                    '{prefix4}',
                    rendezvousPath.slice(0, 1),
                ).replaceAll('{prefix8}', rendezvousPath.slice(0, 2));
                setup = {
                    role: 'initiator',
                    ak: randomRendezvousAuthenticationKey(crypto),
                    relayedWebSocket: {
                        pathId: 1,
                        url: `${url}/${rendezvousPath}`,
                    },
                };
            }

            // Create RendezvousConnection and open WebSocket connection
            let rendezvous;
            try {
                rendezvous = await RendezvousConnection.create({logging}, setup);
            } catch (error) {
                const message = `Rendezvous connection failed: ${error}`;
                log.warn(message);
                await linkingState.updateState({state: 'error', type: 'connection-error', message});
                throw new BackendCreationError('handled-linking-error', message, {from: error});
            }
            await linkingState.updateState({
                state: 'waiting-for-handshake',
                joinUri: rendezvous.joinUri,
            });

            // Do the rendezvous handshake and wait for nomination of a path
            let connectResult;
            try {
                connectResult = await rendezvous.connect();
            } catch (error) {
                const message = `Rendezvous handshake failed: ${error}`;
                log.warn(`${message}\n\n${extractErrorTraceback(ensureError(error))}`);
                await linkingState.updateState({state: 'error', type: 'rendezvous-error', message});
                throw new BackendCreationError('handled-linking-error', message, {from: error});
            }
            log.info('Rendezvous connection established');
            await linkingState.updateState({
                state: 'nominated',
                rph: connectResult.rph,
            });

            // Now that we established the connection and showed the RPH, we can wait for ED to
            // start sending essential data and then run the join protocol.
            const joinProtocol = new DeviceJoinProtocol(
                connectResult.connection,
                logging.logger('backend-controller.join'),
            );
            try {
                await joinProtocol.run(); // TODO(DESK-1037): Error handling
            } catch (error) {
                const message = `Device join protocol failed: ${error}`;
                log.warn(`${message}\n\n${extractErrorTraceback(ensureError(error))}`);
                await linkingState.updateState({state: 'error', type: 'join-error', message});
                throw new BackendCreationError('handled-linking-error', message, {from: error});
            }

            /*

            // Prepare identity data
            identityData = {
                identity,
                ck,
                serverGroup,
            };

            // Generate new random database key
            const databaseKey = wrapRawDatabaseKey(
                crypto.randomBytes(new Uint8Array(DATABASE_KEY_LENGTH)),
            );

            // Write to key storage
            assert(
                keyStoragePassword !== undefined,
                "Expect keyStoragePassword to be provided for build target 'electron'",
            );
            const keyStorage = factories.keyStorage(
                {config, crypto},
                logging.logger('key-storage'),
            );
            try {
                await keyStorage.write(keyStoragePassword, {
                    schemaVersion: 2,
                    identityData: {
                        identity,
                        ck: rawCkForKeystore,
                        serverGroup,
                    },
                    dgk,
                    databaseKey,
                    deviceIds: {...deviceIds},
                });
            } catch (error) {
                throw new BackendCreationError(
                    'key-storage-error',
                    `Could not write to key storage: ${error}`,
                    {from: error},
                );
            }

            // Purge sensitive data
            rawCkForKeystore.purge();
            backupData.user.privatekey = '<purged>';

            */
        }

        // Initialize key storage
        const keyStorage = factories.keyStorage({config, crypto}, logging.logger('key-storage'));
        if (!keyStorage.isPresent()) {
            // No key storage was found. Signal this to the caller, so that the device linking flow
            // can be triggered.
            throw new BackendCreationError('no-identity', 'No identity was found');
        }

        // Ensure that we have a password
        if (keyStoragePassword === undefined) {
            // Key storage is present, but cannot be decrypted without a password
            throw new BackendCreationError(
                'key-storage-error-missing-password',
                'Key storage cannot be decrypted, missing password?',
            );
        }

        // Try to read the credentials from the key storage.
        //
        // TODO(DESK-383): We might need to move this whole section into a pre-step
        //     before the backend is actually attempted to be created.
        let keyStorageContents: KeyStorageContents;
        try {
            keyStorageContents = await keyStorage.read(keyStoragePassword);
        } catch (error) {
            assertError(error, KeyStorageError);
            switch (error.type) {
                case 'not-found':
                    // This should not happen as it is caught above.
                    throw new Error(
                        `Unexpected error type: ${error.type} (${extractErrorMessage(
                            error,
                            'short',
                        )})`,
                    );
                case 'not-readable':
                    // TODO(DESK-383): Assume a permission issue. This cannot be solved by
                    //     overwriting. Gracefully return to the UI and notify the user.
                    throw new BackendCreationError(
                        'key-storage-error',
                        'Key storage is not readable',
                        {from: error},
                    );
                case 'malformed':
                case 'invalid':
                    // TODO(DESK-383): Assume data corruption. Gracefully return to the UI,
                    //     allow the user to purge all data and start with the device join
                    //     process.
                    throw new BackendCreationError(
                        'key-storage-error',
                        'Key storage contents are malformed or invalid',
                        {from: error},
                    );
                case 'undecryptable':
                    // Assume that the password was incorrect and let the user retry.
                    throw new BackendCreationError(
                        'key-storage-error-wrong-password',
                        'Key storage cannot be decrypted, wrong password?',
                        {from: error},
                    );
                case 'internal-error':
                    throw new BackendCreationError(
                        'key-storage-error',
                        'Key storage cannot be read, internal error',
                        {from: error},
                    );
                case 'not-writable':
                    return assertUnreachable(
                        'Unexpected not-writable error when reading key storage',
                    );
                default:
                    unreachable(error.type);
            }
        }

        // Extract identity data from key storage
        identityData = {
            identity: keyStorageContents.identityData.identity,
            ck: SecureSharedBoxFactory.consume(
                crypto,
                keyStorageContents.identityData.ck,
            ) as ClientKey,
            serverGroup: keyStorageContents.identityData.serverGroup,
        };
        dgk = keyStorageContents.dgk;
        deviceIds = keyStorageContents.deviceIds;

        // Create database
        //
        // TODO(DESK-383): Some kind of signal whether the database file needs to exist needs
        //     to be passed into the worker. If the database does not exist but should exist,
        //     gracefully return to the UI, etc.
        const db = factories.db({config}, logging.logger('db'), keyStorageContents.databaseKey);

        // Create other service instances
        const timer = new GlobalTimer();
        const device = new DeviceBackend({crypto, db, logging}, identityData, deviceIds, dgk);
        const file = factories.fileStorage({config, crypto}, logging.logger('storage'));
        const blob = new FetchBlobBackend({config, device});
        const notificationCreatorEndpoint = endpoint.wrap<NotificationCreator>(
            notificationCreator,
            logging.logger('com.notification'),
        );
        const notification = new NotificationService(
            logging.logger('bw.backend.notification'),
            notificationCreatorEndpoint,
        );
        const systemDialog: Remote<SystemDialogService> = endpoint.wrap(
            systemDialogEndpoint,
            logging.logger('com.system-dialog'),
        );
        const taskManager = new TaskManager({logging});
        const model = new ModelRepositories({
            blob,
            config,
            crypto,
            db,
            device,
            directory,
            endpoint,
            file,
            logging,
            notification,
            taskManager,
            systemDialog,
            timer,
        });
        const viewModel = new ViewModelRepository(
            {model, config, crypto, endpoint, file, logging, device},
            new ViewModelCache(),
        );

        // Create backend
        const backend = new Backend({
            blob,
            compressor,
            config,
            crypto,
            device,
            directory,
            endpoint,
            file,
            logging,
            model,
            viewModel,
            notification,
            systemDialog,
            taskManager,
            timer,
        });

        /* TODO(DESK-1038)

        if (backupData !== undefined) {
            try {
                await bootstrapFromBackup(backend._services, identityData.identity, backupData);
            } catch (error) {
                assertError(error, SafeError);
                log.error('Safe Backup could not be imported with a fatal error', error);

                throw new BackendCreationError(
                    'restore-failed',
                    `Safe data restore failed: ${error.message}`,
                    {from: error},
                );
            }

            requestContactProfilePictures(backend._services);
            requestGroupSync(backend._services);
        }
        */

        // Expose the backend on a new channel
        const {local, remote} = endpoint.createEndpointPair<BackendHandle>();
        endpoint.exposeProxy(backend, local, logging.logger('com.backend'));
        return endpoint.transfer(remote, [remote]);
    }

    /**
     * Trigger capturing network packets to be displayed in the debug network tab.
     */
    public capture(): LocalStore<DisplayPacket | undefined> {
        // TODO(DESK-772): We need to create some kind of "push-only" store where data is
        // transferred instead of structuredly cloned.
        this._log.info('Starting to capture packets');
        const store = new WritableStore<DisplayPacket | undefined>(undefined, {
            activator: (): StoreDeactivator => {
                // Forward any captured packets via the remote port
                this._capture = Object.fromEntries(
                    Object.entries(RAW_CAPTURE_CONVERTER).map(([key, {inbound, outbound}]) => [
                        key,
                        {
                            inbound: (packet: RawPacket, meta?: PacketMeta): void =>
                                // TODO(DESK-772): Transfer!
                                {
                                    store.set(inbound(packet, meta)[0]);
                                },
                            outbound: (packet: RawPacket, meta?: PacketMeta): void => {
                                // TODO(DESK-772): Transfer!
                                store.set(outbound(packet, meta)[0]);
                            },
                        },
                    ]),
                ) as RawCaptureHandlers;
                return (): void => (this._capture = undefined);
            },
            debug: {tag: 'capture'},
        });
        return store;
    }

    /**
     * Self-kick device from mediator server.
     */
    public async selfKickFromMediator(): Promise<void> {
        this._log.warn('Self-kicking device from mediator');
        const ownDeviceId = this._services.device.d2m.deviceId;
        // Note: This call will fail if no connection is available, but that is acceptable for now.
        await this._services.taskManager.schedule(new DropDeviceTask(ownDeviceId));
    }
}

/**
 * Handles connections to the mediator server. It ensures the following things:
 *
 * - That only one connection to the server is active.
 * - A persistent connection to the server, i.e. detects disconnects and does auto-reconnect when
 *   requested.
 * - Applies sensible delays between connection attempts to prevent DoS while providing reasonable
 *   UX.
 * - Manages the connection state.
 * - Ensures that all relevant tasks are not lost between reconnections.
 */
class ConnectionManager {
    public readonly [TRANSFER_MARKER] = PROXY_HANDLER;
    public readonly state: MonotonicEnumStore<ConnectionState>;
    public readonly leaderState: MonotonicEnumStore<D2mLeaderState>;
    private readonly _log: Logger;
    private _autoReconnect: ResolvablePromise<void> = ResolvablePromise.resolve();
    private _connection?: Connection;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ) {
        this._log = _services.logging.logger('connection.manager');
        this.state = ConnectionStateUtils.createStore(
            MonotonicEnumStore,
            ConnectionState.DISCONNECTED,
            {log: _services.logging.logger('connection.state'), tag: 'state'},
        );
        this.leaderState = D2mLeaderStateUtils.createStore(
            MonotonicEnumStore,
            D2mLeaderState.NONLEADER,
            {log: _services.logging.logger('connection.leaderState'), tag: 'state'},
        );
        this._run().catch((error) =>
            assertUnreachable(`Connection manager failed to run: ${error}`),
        );
    }

    /**
     * Disable auto-reconnect. The current connection will be closed (if any).
     */
    public disableAutoReconnect(): void {
        this._log.debug('Turning off auto-reconnect');
        this._connection?.disconnect();
        this._autoReconnect = new ResolvablePromise();
    }

    /**
     * Toggle auto-reconnect. When auto-reconnect is turned off, the current connection will be
     * closed.
     */
    public toggleAutoReconnect(): void {
        if (this._autoReconnect.done) {
            this.disableAutoReconnect();
        } else {
            this._log.debug('Turning on auto-reconnect');
            this._autoReconnect.resolve();
        }
    }

    private async _run(): Promise<never> {
        const {config, systemDialog} = this._services;
        const reconnectionDelayMs = config.MEDIATOR_RECONNECTION_DELAY_S * 1000;
        let skipConnectionDelay = false;
        for (;;) {
            // Check if we should (re)connect.
            if (!this._autoReconnect.done) {
                this._log.debug(
                    'Auto-connection currently disabled. Waiting until auto-reconnection has been re-enabled.',
                );
            }
            await this._autoReconnect;

            // Check if network connectivity is available.
            //
            // Note: We cannot use the 'online' event because it does not fire on its own without
            //       something making a network request. In other words, it is totally useless. See:
            //       https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
            if (!self.navigator.onLine) {
                this._log.debug('Currently offline. Connection will probably fail.');
            }
            const startMs = Date.now();
            const {lastConnectionState, closeInfo} = await this._connectAndWaitUntilClosed();
            const elapsedMs = Date.now() - startMs;

            if (CloseCodeUtils.containsNumber(closeInfo.code)) {
                // Exhaustively handle known close codes
                switch (closeInfo.code) {
                    case CloseCode.UNSUPPORTED_PROTOCOL_VERSION:
                        if (closeInfo.clientInitiated === true) {
                            const handle = await systemDialog.open({
                                type: 'connection-error',
                                context: {
                                    type: 'mediator-update-required',
                                    userCanReconnect: true,
                                },
                            });
                            this._log.info(
                                'Waiting for user interaction before reenabling reconnect',
                            );
                            const action = await handle.closed;
                            // eslint-disable-next-line max-depth
                            switch (action) {
                                case 'confirmed': // Reconnect
                                    skipConnectionDelay = true;
                                    break;
                                case 'cancelled':
                                    this.disableAutoReconnect();
                                    break;
                                default:
                                    unreachable(action);
                            }
                        } else if (closeInfo.clientInitiated === false) {
                            void systemDialog.open({
                                type: 'connection-error',
                                context: {
                                    type: 'client-update-required',
                                    userCanReconnect: false,
                                },
                            });

                            this.disableAutoReconnect();
                        }
                        break;
                    case CloseCode.DEVICE_DROPPED:
                    case CloseCode.EXPECTED_DEVICE_SLOT_STATE_MISMATCH:
                        // Both cases happen for the same reason (another device dropped us from the multi-device group)
                        // but DEVICE_DROPPED happens while we are connected, and EXPECTED_DEVICE_SLOT_STATE_MISMATCH
                        // when the dropping happened while we were offline and we are trying to reconnect.
                        void systemDialog.open({
                            type: 'connection-error',
                            context: {
                                type: 'client-was-dropped',
                                userCanReconnect: false,
                            },
                        });

                        this.disableAutoReconnect();
                        break;
                    case CloseCode.DEVICE_LIMIT_REACHED:
                    case CloseCode.DEVICE_ID_REUSED:
                    case CloseCode.REFLECTION_QUEUE_LENGTH_LIMIT_REACHED:
                        // TODO(DESK-487): Request user interaction to continue
                        this.disableAutoReconnect();
                        throw new Error(
                            `TODO(DESK-487): Connection closed, request user interaction to continue (code=${closeInfo.code}, reason=${closeInfo.reason})`,
                        );
                    case CloseCode.NORMAL:
                    case CloseCode.SERVER_SHUTDOWN:
                    case CloseCode.ABNORMAL_CLOSURE:
                    case CloseCode.CSP_CLOSED:
                    case CloseCode.CSP_UNABLE_TO_ESTABLISH:
                    case CloseCode.CSP_INTERNAL_ERROR:
                    case CloseCode.PROTOCOL_ERROR:
                    case CloseCode.TRANSACTION_TTL_EXCEEDED:
                    case CloseCode.UNEXPECTED_ACK:
                    case CloseCode.CLIENT_TIMEOUT:
                    case CloseCode.INTERNAL_ERROR:
                    case CloseCode.WEBSOCKET_UNABLE_TO_ESTABLISH:
                        // Recoverable close case: Let client continue with standard reconnect logic.
                        this._log.info(
                            `Connection closed with code ${
                                CloseCodeUtils.nameOf(closeInfo.code) ?? '<unknown>'
                            } (code=${closeInfo.code}, reason=${closeInfo.reason})`,
                        );
                        break;
                    default:
                        unreachable(closeInfo.code);
                }
            } else if (closeInfo.code >= 4100 && closeInfo.code < 4200) {
                this.disableAutoReconnect();
                // TODO(DESK-487): Request user interaction to continue?
                throw new Error(
                    `Connection closed with unrecoverable unknown close code (code=${closeInfo.code}, reason=${closeInfo.reason})`,
                );
            } else {
                this._log.warn(
                    `Connection closed with recoverable unknown code (code=${closeInfo.code}, reason=${closeInfo.reason})`,
                );
            }

            if (lastConnectionState !== ConnectionState.CONNECTED && !skipConnectionDelay) {
                // When we weren't connected, we wait **exactly** 5s before making another attempt,
                // regardless on how long the connection took.
                this._log.debug(
                    'Last connection did not fulfill both handshakes. Waiting 5s before making another connection attempt',
                );
                await this._services.timer.sleep(reconnectionDelayMs);
                skipConnectionDelay = false;
            } else if (!skipConnectionDelay) {
                // When we were connected, we ensure that the total wait time does not exceed 5s
                // between connection attempts.
                const waitMs =
                    elapsedMs > reconnectionDelayMs ? 0 : reconnectionDelayMs - elapsedMs;
                this._log.debug(
                    `Waiting ${(waitMs / 1000).toFixed(
                        1,
                    )}s before making another connection attempt`,
                );
                await this._services.timer.sleep(waitMs);
            }
        }
    }

    private async _connectAndWaitUntilClosed(): Promise<{
        readonly lastConnectionState: ConnectionState;
        readonly closeInfo: CloseInfo;
    }> {
        // Attempt to connect
        this._log.info('Connecting');
        const taskManager = this._services.taskManager.replace(
            this.state.reset(ConnectionState.CONNECTING),
        );
        assert(taskManager instanceof ConnectedTaskManager);
        assert(this.state.get() === ConnectionState.CONNECTING);
        assert(this.leaderState.get() === D2mLeaderState.NONLEADER);
        try {
            this._connection = await Connection.create(
                this._services,
                taskManager,
                this._getCaptureHandlers,
            );
        } catch (error) {
            this._log.warn('Could not create connection', error);
            this._services.taskManager.replace(this.state.set(ConnectionState.DISCONNECTED));
            this.leaderState.reset(D2mLeaderState.NONLEADER);
            return {
                lastConnectionState: this.state.get(),
                closeInfo: {
                    code: CloseCode.WEBSOCKET_UNABLE_TO_ESTABLISH,
                    clientInitiated: undefined,
                },
            };
        }

        // Subscribe to connection states
        const unsubscribeState = this._connection.state.subscribe((state) => this.state.set(state));
        const unsubscribeLeaderState = this._connection.leaderState.subscribe((state) =>
            this.leaderState.set(state),
        );

        // Wait until closed
        this._log.info('Connected, waiting until closed');
        let state: {readonly lastConnectionState: ConnectionState; readonly closeInfo: CloseInfo};
        try {
            const closeInfo = await this._connection.closed;
            state = {lastConnectionState: this.state.get(), closeInfo};
        } catch (error) {
            this._log.error('Connection closed promise failed', error);
            state = {
                lastConnectionState: this.state.get(),
                closeInfo: {code: CloseCode.INTERNAL_ERROR, clientInitiated: undefined},
            };
        }
        unsubscribeState();
        unsubscribeLeaderState();
        this._services.taskManager.replace(this.state.set(ConnectionState.DISCONNECTED));
        this.leaderState.reset(D2mLeaderState.NONLEADER);
        this._connection = undefined;
        return state;
    }
}

/**
 * Bootstrap the user's profile from backup data.
 */
async function bootstrapFromBackup(
    services: ServicesForBackend,
    identity: IdentityString,
    backupData: SafeBackupData,
): Promise<void> {
    // Profile settings: Nickname and profile picture
    const profile: Mutable<ProfileSettingsView> = {
        nickname: ensureNickname(identity as string),
        profilePictureShareWith: {group: 'everyone'},
    };
    if (isNickname(backupData.user.nickname)) {
        profile.nickname = backupData.user.nickname;
    }
    profile.profilePicture = backupData.user.profilePic;
    if (backupData.user.profilePicRelease !== undefined) {
        profile.profilePictureShareWith = backupData.user.profilePicRelease;
    }
    services.model.user.profileSettings.get().controller.update(profile);

    // Contacts
    const contactImporter = new SafeContactImporter(services);
    await contactImporter.importFrom(backupData);

    // Groups
    const groupImporter = new SafeGroupImporter(services);
    groupImporter.importFrom(backupData);
}

function requestContactProfilePictures(services: ServicesForBackend): void {
    const {model, taskManager} = services;

    // Gather all non-gateway contacts
    const contacts = [];
    for (const contact of model.contacts.getAll().get()) {
        const identity = contact.get().view.identity;
        if (identity === 'ECHOECHO' || identity.startsWith('*')) {
            continue;
        }
        contacts.push(contact);
    }

    // Launch task
    const task = new OutgoingContactRequestProfilePictureTask(services, contacts);
    void taskManager.schedule(task);
}

function requestGroupSync(services: ServicesForBackend): void {
    const {model, taskManager} = services;

    // Gather all groups where we're an active member and not the creator
    const groups = [];
    const ownIdentity = model.user.identity;
    for (const group of model.groups.getAll().get()) {
        const view = group.get().view;
        if (view.creatorIdentity === ownIdentity) {
            continue;
        }
        if (view.userState !== GroupUserState.MEMBER) {
            continue;
        }
        groups.push(group);
    }

    // Launch task
    const task = new OutgoingGroupSyncRequestTask(services, groups);
    void taskManager.schedule(task);
}

interface NavigatorUAData {
    mobile: boolean;
    platform: string;
}

/**
 * Format: `<app-version>;<platform>;<lang>/<country-code>;<renderer>;<renderer-version>;<os-name>;<os-architecture>`
 */
function makeCspClientInfo(browserInfo: BrowserInfo): string {
    let locale = new Intl.DateTimeFormat().resolvedOptions().locale.replace('-', '/');
    if (!locale.includes('/')) {
        locale += '/??';
    }

    const browser = browserInfo.name;
    const browserVersion = browserInfo.version ?? '0.0.0';

    // TODO(DESK-792): Get system info from NodeJS
    let osName = '';
    const osArchitecture = '';
    if ('userAgentData' in self.navigator) {
        osName = (self.navigator.userAgentData as NavigatorUAData).platform;
    }

    const version = import.meta.env.BUILD_VERSION;

    return `${version};Q;${locale};${browser};${browserVersion};${osName};${osArchitecture}`;
}

/**
 * Platform details, e.g. "Firefox 91"
 */
function makeD2mPlatformDetails(browserInfo: BrowserInfo): string {
    let details = browserInfo.name;
    if (browserInfo.version !== undefined) {
        details += ` ${browserInfo.version}`;
    }
    return details;
}

/**
 * Handles a single connection to the mediator server.
 */
class Connection {
    public constructor(
        private readonly _mediator: MediatorWebSocketTransport,
        public readonly state: StrictMonotonicEnumStore<ConnectionState>,
        public readonly leaderState: StrictMonotonicEnumStore<D2mLeaderState>,
    ) {}

    public static async create(
        services: ServicesForBackend,
        taskManager: ConnectedTaskManager,
        getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ): Promise<Connection> {
        const {config, crypto, device, logging} = services;
        const log = logging.logger(`connection.${taskManager.id}`);
        const connectionState = ConnectionStateUtils.createStore(
            MonotonicEnumStore,
            ConnectionState.CONNECTING,
        );
        const leaderState = D2mLeaderStateUtils.createStore(
            MonotonicEnumStore,
            D2mLeaderState.NONLEADER,
        );

        // Generate ephemeral TCK
        const tck = new SharedBoxFactory(
            crypto,
            wrapRawKey(
                crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                NACL_CONSTANTS.KEY_LENGTH,
            ).asReadonly(),
        ) as TemporaryClientKey;

        // Create protocol controller
        const abort = new AbortRaiser();
        const delayedConnection = Delayed.simple<ConnectionHandle>(
            'Tried to access connection handle before connected',
            'Connection handle has already been set',
        );
        const browserInfo = getBrowserInfo(self.navigator.userAgent);
        const cspClientInfo = makeCspClientInfo(browserInfo);
        const d2mPlatformDetails = makeD2mPlatformDetails(browserInfo);
        log.debug(`CSP client info string: ${cspClientInfo}`);
        const controller = new ProtocolController(
            services,
            taskManager,
            delayedConnection,
            abort.listener,
            // CSP
            {
                nonceGuard: device.csp.nonceGuard,
                ck: device.csp.ck,
                tck,
                identity: device.identity.bytes,
                info: cspClientInfo,
                deviceId: device.csp.deviceId,
                // TODO(DESK-775): Get from config
                echoRequestIntervalS: 10,
                // TODO(DESK-775): Get from config
                serverIdleTimeoutS: 30,
                // TODO(DESK-775): Get from config
                clientIdleTimeoutS: 10,
            },
            // D2M
            {
                nonceGuard: device.d2m.nonceGuard,
                dgpk: device.d2m.dgpk,
                dgdik: device.d2m.dgdik,
                deviceId: device.d2m.deviceId,
                deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy.PERSISTENT,
                platformDetails: d2mPlatformDetails,
                // TODO(DESK-773): Make this user-configurable
                label: 'Desktop',
            },
            // D2D
            {
                nonceGuard: device.d2d.nonceGuard,
                dgrk: device.d2d.dgrk,
                dgtsk: device.d2d.dgtsk,
            },
        );

        // Tie the connection state to the two protocol's auth states
        const unsubscribers = [
            controller.csp.state.subscribe((state) => {
                log.info(`CSP auth state: ${CspAuthStateUtils.NAME_OF[state]}`);
                // The transport state moves us into the "handshake" state, so we
                // only need to listen to the "completed" state.
                if (state === CspAuthState.COMPLETE) {
                    // We're "connected" if D2M is "complete", otherwise we're
                    // only "partially connected".
                    if (controller.d2m.state.get() !== D2mAuthState.COMPLETE) {
                        connectionState.set(ConnectionState.PARTIALLY_CONNECTED);
                    } else {
                        connectionState.set(ConnectionState.CONNECTED);
                    }
                }
            }),
            controller.d2m.state.subscribe((state) => {
                log.info(`D2M auth state: ${D2mAuthStateUtils.NAME_OF[state]}`);
                // The transport state moves us into the "handshake" state, so we
                // only need to listen to the "completed" state.
                if (state === D2mAuthState.COMPLETE) {
                    // We're "connected" if CSP is "complete", otherwise we're
                    // only "partially connected".
                    if (controller.csp.state.get() !== CspAuthState.COMPLETE) {
                        connectionState.set(ConnectionState.PARTIALLY_CONNECTED);
                    } else {
                        connectionState.set(ConnectionState.CONNECTED);
                    }
                }
            }),
        ];

        // Update leader state
        controller.d2m.promotedToLeader
            .then(() => leaderState.set(D2mLeaderState.LEADER))
            .catch((error) => {
                log.warn(`Leader state promise errored: ${error}`);
            });

        // Connect to mediator server and set up pipelines
        const options: WebSocketEventWrapperStreamOptions = {
            signal: abort.attach(new AbortController()),
            // The below configuration gives us a theoretical maximum throughput of 25 MiB/s
            // if the browser does not throttle the polling.
            highWaterMark: 524288, // 8 chunks of 64 KiB -> 512 KiB
            lowWaterMark: 131072, // 2 chunks of 64 KiB -> 128 KiB
            pollIntervalMs: 20, // Poll every 20ms until the low water mark has been reached
        };
        const prefix = byteToHex(device.d2m.dgpk.public[0]);
        const url = config.MEDIATOR_SERVER_URL.replaceAll('{prefix4}', prefix[0]).replaceAll(
            '{prefix8}',
            prefix,
        );
        log.debug(`Connecting to ${url}`);
        const mediator = new MediatorWebSocketTransport(
            {
                url,
                deviceGroupId: device.d2m.dgpk.public,
                serverGroup: device.serverGroup,
            },
            options,
            (stream) =>
                applyMediatorStreamPipeline(
                    services,
                    stream,
                    {
                        layer2: controller.forLayer2(),
                        layer3: controller.forLayer3(),
                        layer4: controller.forLayer4(),
                        layer5: controller.forLayer5(),
                    },
                    getCaptureHandlers(),
                ),
        );
        mediator.closed
            .then((info) => log.info('Mediator transport closed cleanly:', info))
            .catch((error) => log.warn('Mediator transport closed with error:', error))
            .finally(() => {
                for (const unsubscribe of unsubscribers) {
                    unsubscribe();
                }
                connectionState.set(ConnectionState.DISCONNECTED);
            });
        log.debug('Waiting for mediator transport to be connected');
        const pipe = await mediator.pipe;
        log.debug('Mediator transport pipe attached');
        pipe.readable
            .then(() => log.warn('Mediator transport readable pipe detached'))
            .catch((error) => log.warn('Mediator transport readable side errored:', error));
        pipe.writable
            .then(() => log.warn('Mediator transport writable side detached'))
            .catch((error) => log.warn('Mediator transport writable side errored:', error));
        connectionState.set(ConnectionState.HANDSHAKE);

        // Run the task manager
        controller.taskManager
            .run(services, controller, abort.listener)
            .then((v) => unreachable(v))
            .catch((error) => log.warn('Task manager errored:', error));

        const connection = new Connection(mediator, connectionState, leaderState);
        delayedConnection.set(connection);
        return connection;
    }

    /**
     * 'closed' promise of the underlying connection.
     */
    public get closed(): Promise<CloseInfo> {
        return this._mediator.closed;
    }

    /**
     * Immediately disconnects from the WebSocket. Starts the closing flow.
     *
     * Note: This immediately resolves the 'closed' promise with the requested close info, even if
     * the closing flow is still ongoing.
     */
    public disconnect(info: CloseInfo = {code: CloseCode.NORMAL, clientInitiated: true}): void {
        this._mediator.close(info);
    }
}
