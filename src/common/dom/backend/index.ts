import type {ServicesForBackend, ServicesThatRequireIdentity} from '~/common/backend';
import type {Compressor} from '~/common/compressor';
import {NACL_CONSTANTS, wrapRawKey} from '~/common/crypto';
import {SecureSharedBoxFactory, SharedBoxFactory} from '~/common/crypto/box';
import {NonceService} from '~/common/crypto/nonce';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {
    DATABASE_KEY_LENGTH,
    type DatabaseBackend,
    type RawDatabaseKey,
    type ServicesForDatabaseFactory,
    wrapRawDatabaseKey,
} from '~/common/db';
import {DeviceBackend, type DeviceIds, type IdentityData} from '~/common/device';
import {BackgroundJobScheduler} from '~/common/dom/backend/background-job-scheduler';
import {workLicenseCheckJob} from '~/common/dom/backend/background-jobs';
import {DeviceJoinProtocol, type DeviceJoinResult} from '~/common/dom/backend/join';
import {randomBytes} from '~/common/dom/crypto/random';
import {DebugBackend} from '~/common/dom/debug';
import {FetchBlobBackend} from '~/common/dom/network/protocol/fetch-blob';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {applyMediatorStreamPipeline} from '~/common/dom/network/protocol/pipeline';
import {
    RendezvousConnection,
    type RendezvousProtocolSetup,
} from '~/common/dom/network/protocol/rendezvous';
import {workLicenseCheck} from '~/common/dom/network/protocol/work-license-check';
import {MediatorWebSocketTransport} from '~/common/dom/network/transport/mediator-websocket';
import type {WebSocketEventWrapperStreamOptions} from '~/common/dom/network/transport/websocket';
import type {SafeCredentials} from '~/common/dom/safe';
import {type BrowserInfo, getBrowserInfo, makeCspClientInfo} from '~/common/dom/utils/browser';
import type {SystemInfo} from '~/common/electron-ipc';
import {
    CloseCode,
    CloseCodeUtils,
    CspAuthStateUtils,
    D2mAuthStateUtils,
    D2mLeaderState,
    D2mLeaderStateUtils,
    GlobalPropertyKey,
    NonceScope,
    TransferTag,
} from '~/common/enum';
import {
    BaseError,
    type BaseErrorOptions,
    DeviceJoinError,
    extractErrorTraceback,
    type RendezvousCloseCause,
    RendezvousCloseError,
    ConnectionClosed,
} from '~/common/error';
import type {FileStorage, ServicesForFileStorageFactory} from '~/common/file-storage';
import {
    type KeyStorage,
    type KeyStorageContents,
    KeyStorageError,
    type ServicesForKeyStorageFactory,
} from '~/common/key-storage';
import {createLoggerStyle, type Logger, type LoggerFactory} from '~/common/logging';
import type {Repositories} from '~/common/model';
import {ModelRepositories} from '~/common/model/repositories';
import type {CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import {
    type DisplayPacket,
    type PacketMeta,
    RAW_CAPTURE_CONVERTER,
    type RawCaptureHandlers,
    type RawPacket,
} from '~/common/network/protocol/capture';
import {type ConnectionHandle, ProtocolController} from '~/common/network/protocol/controller';
import {type DirectoryBackend, DirectoryError} from '~/common/network/protocol/directory';
import {
    ConnectionState,
    ConnectionStateUtils,
    CspAuthState,
    D2mAuthState,
} from '~/common/network/protocol/state';
import {DropDeviceTask} from '~/common/network/protocol/task/d2m/drop-device';
import {ConnectedTaskManager, TaskManager} from '~/common/network/protocol/task/manager';
import {
    type ClientKey,
    randomRendezvousAuthenticationKey,
    type RawClientKey,
    type RawDeviceGroupKey,
    type TemporaryClientKey,
    wrapRawClientKey,
    wrapRawDeviceGroupKey,
} from '~/common/network/types/keys';
import type {ThreemaWorkCredentials} from '~/common/node/key-storage/key-storage-file';
import {type NotificationCreator, NotificationService} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import {
    assert,
    assertError,
    assertUnreachable,
    ensureError,
    unreachable,
    unwrap,
} from '~/common/utils/assert';
import {bytesToHex, byteToHex} from '~/common/utils/byte';
import {Delayed} from '~/common/utils/delayed';
import {
    type EndpointFor,
    type EndpointService,
    PROXY_HANDLER,
    type ProxyMarked,
    registerErrorTransferHandler,
    type Remote,
    TRANSFER_HANDLER,
    type TransferredFromRemote,
    type TransferredToRemote,
} from '~/common/utils/endpoint';
import {Identity} from '~/common/utils/identity';
import {u64ToHexLe} from '~/common/utils/number';
import {taggedRace} from '~/common/utils/promise';
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
    public [TRANSFER_HANDLER] = BACKEND_CREATION_ERROR_TRANSFER_HANDLER;

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
    readonly systemInfo: SystemInfo;
}

/**
 * Data required to be supplied to a backend worker for initialisation.
 */
export interface BackendInitAfterTransfer {
    readonly notificationEndpoint: TransferredToRemote<EndpointFor<NotificationCreator>>;
    readonly systemDialogEndpoint: TransferredToRemote<EndpointFor<SystemDialogService>>;
    readonly systemInfo: SystemInfo;
}

/**
 * Interface exposed by the worker towards the backend controller. It is used to instantiate the
 * backend in the context of the worker.
 */
export interface BackendCreator {
    /** Return whether or not an identity (i.e. a key storage file) is present. */
    readonly hasIdentity: () => boolean;

    /** Instantiate backend from an existing key storage. */
    readonly fromKeyStorage: (
        init: Remote<BackendInitAfterTransfer>,
        userPassword: string,
    ) => Promise<TransferredToRemote<EndpointFor<BackendHandle>>>;

    /** Instantiate backend through the device join protocol. */
    readonly fromDeviceJoin: (
        init: Remote<BackendInitAfterTransfer>,
        deviceLinkingSetup: TransferredFromRemote<EndpointFor<DeviceLinkingSetup>>,
    ) => Promise<TransferredToRemote<EndpointFor<BackendHandle>>>;
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
    | 'keyStorage'
    | 'viewModel'
    | 'selfKickFromMediator'
>;

/**
 * Service factories needed for a backend worker.
 */
export interface FactoriesForBackend {
    /** Instantiate logger factory. */
    readonly logging: (rootTag: string, defaultStyle: string) => LoggerFactory;
    /** Instantiate key storage. */
    readonly keyStorage: (services: ServicesForKeyStorageFactory, log: Logger) => KeyStorage;
    /** Instantiate file storage. */
    readonly fileStorage: (services: ServicesForFileStorageFactory, log: Logger) => FileStorage;
    /** Instantiate compressor. */
    readonly compressor: () => Compressor;
    /**
     * Instantiate database backend.
     *
     * Note: The {@link key} may be consumed and purged after initialization!
     */
    readonly db: (
        services: ServicesForDatabaseFactory,
        log: Logger,
        key: RawDatabaseKey,
        shouldExist: boolean,
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
 * - restore-error: Restoring essential data did not succeed.
 * - identity-transfer-prohibited: Restoring failed because user tried to link a Threema Work ID
 *   with the consumer build variant, or vice versa
 * - invalid-identity: Restoring failed because user identity is unknown or revoked
 * - invalid-work-credentials: Restoring failed because user's Threema Work credentials are invalid or expired
 * - registration-error: Initial registration at Mediator server failed.
 * - generic-error: Some other error during linking.
 */
export type LinkingStateErrorType =
    | {readonly kind: 'connection-error'; readonly cause: RendezvousCloseCause}
    | {readonly kind: 'rendezvous-error'; readonly cause: RendezvousCloseCause}
    | {readonly kind: 'join-error'}
    | {readonly kind: 'restore-error'}
    | {readonly kind: 'identity-transfer-prohibited'}
    | {readonly kind: 'invalid-identity'}
    | {readonly kind: 'invalid-work-credentials'}
    | {readonly kind: 'registration-error'}
    | {readonly kind: 'generic-error'};

export type SyncingPhase = 'receiving' | 'restoring' | 'encrypting';

/**
 * The backend's linking state.
 */
export type LinkingState =
    /**
     * Initial state.
     */
    | {readonly state: 'initializing'}
    /**
     * Rendezvous WebSocket connection is established.
     */
    | {readonly state: 'waiting-for-handshake'; joinUri: string}
    /**
     * Rendezvous protocol is complete. The rendezvous path hash is included.
     */
    | {readonly state: 'nominated'; rph: ReadonlyUint8Array}
    /**
     * The "Begin" join message was received, blobs and essential data are being processed.
     */
    | {readonly state: 'syncing'; phase: SyncingPhase}
    /**
     * Essential data is fully processed, we are waiting for the user's password in order to write
     * the key storage.
     */
    | {readonly state: 'waiting-for-password'}
    /**
     * We are registered at the Mediator server and the device join protocol is complete.
     */
    | {readonly state: 'registered'}
    /**
     * An error occurred, device join did not succeed.
     */
    | {
          readonly state: 'error';
          readonly type: LinkingStateErrorType;
          readonly message: string;
      };

export interface DeviceLinkingSetup extends ProxyMarked {
    /**
     * State updates sent from the backend to the frontend.
     */
    readonly linkingState: {
        readonly store: WritableStore<LinkingState>;
        readonly updateState: (state: LinkingState) => void;
    } & ProxyMarked;

    /**
     * A promise that will be fulfilled by the frontend when the user has chosen a password.
     */
    readonly userPassword: Promise<string>;
}

/**
 * Create an instance of the NotificationService, wrapping a remote endpoint.
 */
function createNotificationService(
    endpoint: EndpointService,
    notificationCreator: EndpointFor<NotificationCreator>,
    logging: LoggerFactory,
): NotificationService {
    const notificationCreatorEndpoint = endpoint.wrap<NotificationCreator>(
        notificationCreator,
        logging.logger('com.notification'),
    );
    return new NotificationService(
        logging.logger('bw.backend.notification'),
        notificationCreatorEndpoint,
    );
}

/**
 * Initialize the backend services that don't require an active identity for being intialized.
 */
function initBackendServicesWithoutIdentity(
    factories: FactoriesForBackend,
    {config, endpoint, logging}: Pick<ServicesForBackend, 'config' | 'endpoint' | 'logging'>,
    notificationEndpoint: EndpointFor<NotificationCreator>,
    systemDialogEndpoint: EndpointFor<SystemDialogService>,
    systemInfo: SystemInfo,
): Omit<ServicesForBackend, ServicesThatRequireIdentity> {
    const crypto = new TweetNaClBackend(randomBytes);

    const file = factories.fileStorage({config, crypto}, logging.logger('storage'));
    const compressor = factories.compressor();
    const directory = new FetchDirectoryBackend({config, logging});
    const timer = new GlobalTimer();
    const notification = createNotificationService(endpoint, notificationEndpoint, logging);
    const systemDialog: Remote<SystemDialogService> = endpoint.wrap(
        systemDialogEndpoint,
        logging.logger('com.system-dialog'),
    );
    const taskManager = new TaskManager({logging});
    const keyStorage = factories.keyStorage({config, crypto}, logging.logger('key-storage'));

    return {
        compressor,
        config,
        crypto,
        directory,
        endpoint,
        file,
        keyStorage,
        logging,
        notification,
        systemDialog,
        systemInfo,
        taskManager,
        timer,
    };
}

/**
 * Init the full backend services.
 *
 * Note: The {@link dgk} will be consumed and purged after initialization!
 */
function initBackendServices(
    simpleServices: Omit<ServicesForBackend, ServicesThatRequireIdentity>,
    db: DatabaseBackend,
    identityData: IdentityData,
    deviceIds: DeviceIds,
    dgk: RawDeviceGroupKey,
    nonces: NonceService,
    workCredentials: ThreemaWorkCredentials | undefined,
): ServicesForBackend {
    const {
        config,
        crypto,
        directory,
        endpoint,
        file,
        logging,
        notification,
        taskManager,
        systemDialog,
        timer,
    } = simpleServices;

    const workData = workCredentials === undefined ? undefined : {workCredentials};

    const device = new DeviceBackend(
        {crypto, db, logging, nonces},
        identityData,
        deviceIds,
        dgk,
        workData,
    );
    const blob = new FetchBlobBackend({config, device});
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
        nonces,
        notification,
        taskManager,
        systemDialog,
        timer,
    });
    const viewModel = new ViewModelRepository(
        {model, config, crypto, endpoint, file, logging, device},
        new ViewModelCache(),
    );
    return {
        ...simpleServices,
        device,
        blob,
        model,
        nonces,
        viewModel,
    };
}

/**
 * Write key storage with the provided data.
 */
async function writeKeyStorage(
    {keyStorage}: Pick<ServicesForBackend, 'keyStorage'>,
    password: string,
    identityData: IdentityData,
    deviceIds: DeviceIds,
    ck: RawClientKey,
    dgk: RawDeviceGroupKey,
    databaseKey: RawDatabaseKey,
    workCredentials?: ThreemaWorkCredentials,
): Promise<void> {
    try {
        await keyStorage.write(password, {
            schemaVersion: 2,
            identityData: {
                identity: identityData.identity,
                ck,
                serverGroup: identityData.serverGroup,
            },
            dgk,
            databaseKey,
            deviceIds: {...deviceIds},
            workCredentials: workCredentials === undefined ? undefined : {...workCredentials},
        });
    } catch (error) {
        throw new BackendCreationError(
            'key-storage-error',
            `Could not write to key storage: ${error}`,
            {from: error},
        );
    }
}

/**
 * The backend combines all required services and contains the core logic of our application.
 *
 * The backend lives in the worker thread. It is exposed via its {@link BackendHandle} to the UI
 * thread through the {@link BackendController}.
 */
export class Backend implements ProxyMarked {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public readonly connectionManager: ConnectionManager;
    public readonly debug: DebugBackend;
    public readonly deviceIds: DeviceIds;
    public readonly directory: DirectoryBackend;
    public readonly keyStorage: KeyStorage;
    public readonly model: Repositories;
    public readonly viewModel: IViewModelRepository;

    private readonly _log: Logger;
    private readonly _backgroundJobScheduler: BackgroundJobScheduler;
    private _capture?: RawCaptureHandlers;

    private constructor(private readonly _services: ServicesForBackend) {
        this._log = _services.logging.logger('backend');
        this._backgroundJobScheduler = new BackgroundJobScheduler(_services.logging);
        this.connectionManager = new ConnectionManager(_services, () => this._capture);
        this.debug = new DebugBackend(this._services, this);
        this.deviceIds = {
            cspDeviceId: _services.device.csp.deviceId,
            d2mDeviceId: _services.device.d2m.deviceId,
        };
        this.directory = _services.directory;
        this.model = _services.model;
        this.keyStorage = _services.keyStorage;
        this.viewModel = _services.viewModel;

        // Log IDs
        {
            const dgid = bytesToHex(_services.device.d2m.dgpk.public);
            const d2m = u64ToHexLe(_services.device.d2m.deviceId);
            const csp = u64ToHexLe(this.deviceIds.cspDeviceId);
            this._log.info(
                `Backend created.\nDevice IDs:\n  DGID = ${dgid}\n  D2M  = ${d2m}\n  CSP  = ${csp}`,
            );
        }
    }

    /**
     * Return whether or not an identity (i.e. a key storage file) is present.
     */
    public static hasIdentity(
        factories: FactoriesForBackend,
        {config, logging}: Pick<ServicesForBackend, 'config' | 'logging'>,
    ): boolean {
        const log = logging.logger('backend.create');

        const crypto = new TweetNaClBackend(randomBytes);
        const keyStorage = factories.keyStorage({config, crypto}, logging.logger('key-storage'));
        if (keyStorage.isPresent()) {
            log.info('Identity found');
            return true;
        }
        log.info('No identity found');
        return false;
    }

    /**
     * Create an instance of the backend worker for an existing identity. The identity information
     * is loaded from the key storage.
     *
     * @param init {BackendInit} Data required to be supplied to a backend worker for
     *   initialization.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param keyStoragePassword The password used to unlock the key storage.
     * @returns A remote BackendHandle that can be used by the backend controller to access the
     *   backend worker.
     */
    public static async createFromKeyStorage(
        {notificationEndpoint, systemDialogEndpoint, systemInfo}: BackendInit,
        factories: FactoriesForBackend,
        {config, endpoint, logging}: Pick<ServicesForBackend, 'config' | 'endpoint' | 'logging'>,
        keyStoragePassword: string,
    ): Promise<TransferredToRemote<EndpointFor<BackendHandle>>> {
        const log = logging.logger('backend.create.from-keystorage');
        log.info('Creating backend from existing key storage');

        // Initialize services that are needed early
        const services = initBackendServicesWithoutIdentity(
            factories,
            {config, endpoint, logging},
            notificationEndpoint,
            systemDialogEndpoint,
            systemInfo,
        );

        // Try to read the credentials from the key storage.
        //
        // TODO(DESK-383): We might need to move this whole section into a pre-step
        //                 before the backend is actually attempted to be created.
        let keyStorageContents: KeyStorageContents;
        try {
            keyStorageContents = await services.keyStorage.read(keyStoragePassword);
        } catch (error) {
            assertError(error, KeyStorageError);
            switch (error.type) {
                case 'not-found':
                    // No key storage was found. Signal this to the caller, so that the device
                    // linking flow can be triggered.
                    throw new BackendCreationError('no-identity', 'No identity was found');
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

        // Open database
        const db = factories.db(
            {config},
            logging.logger('db'),
            keyStorageContents.databaseKey,
            true,
        );

        // Create nonces service
        const nonces = new NonceService(
            {crypto: services.crypto, db, logging},
            new Identity(keyStorageContents.identityData.identity),
        );

        // Extract identity data from key storage
        const identityData = {
            identity: keyStorageContents.identityData.identity,
            ck: SecureSharedBoxFactory.consume(
                services.crypto,
                nonces,
                NonceScope.CSP,
                keyStorageContents.identityData.ck,
            ) as ClientKey,
            serverGroup: keyStorageContents.identityData.serverGroup,
        };
        const deviceIds = keyStorageContents.deviceIds;
        const dgk = keyStorageContents.dgk;

        // Create backend
        const backendServices = initBackendServices(
            services,
            db,
            identityData,
            deviceIds,
            dgk,
            nonces,
            keyStorageContents.workCredentials,
        );
        const backend = new Backend(backendServices);

        // Check for unrecoverable problems
        if (
            import.meta.env.BUILD_VARIANT === 'work' &&
            backend._services.device.workData === undefined
        ) {
            // The work app requires work credentials. Older versions of the app did not yet sync
            // and store these fields. Thus, enforce this requirement here.
            log.error(
                'This is a work app, but no work data was found. Profile should be relinked.',
            );
            // TODO(DESK-1227): Force relinking of profile and prevent connection from starting
            // void backendServices.systemDialog.open({type: 'missing-work-credentials'});
            // startConnection = false;
        }

        // Start connection
        void backend.connectionManager.start();

        // Schedule background jobs
        backend._scheduleBackgroundJobs();

        // Expose the backend on a new channel
        const {local, remote} = endpoint.createEndpointPair<BackendHandle>();
        endpoint.exposeProxy(backend, local, logging.logger('com.backend'));
        // eslint-disable-next-line @typescript-eslint/return-await
        return endpoint.transfer(remote, [remote]);
    }

    /**
     * Create an instance of the backend worker for a new identity. This will start the device
     * linking flow.
     *
     * @param init {BackendInit} Data required to be supplied to a backend worker for
     *   initialization.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param deviceLinkingSetup Information needed for the device linking flow.
     * @returns A remote BackendHandle that can be used by the backend controller to access the
     *   backend worker.
     */
    public static async createFromDeviceJoin(
        {notificationEndpoint, systemDialogEndpoint, systemInfo}: BackendInit,
        factories: FactoriesForBackend,
        {config, endpoint, logging}: Pick<ServicesForBackend, 'config' | 'endpoint' | 'logging'>,
        deviceLinkingSetup: EndpointFor<DeviceLinkingSetup>,
    ): Promise<TransferredToRemote<EndpointFor<BackendHandle>>> {
        const log = logging.logger('backend.create.from-join');
        log.info('Creating backend through device linking flow');

        // Initialize services that are needed early
        const services = initBackendServicesWithoutIdentity(
            factories,
            {config, endpoint, logging},
            notificationEndpoint,
            systemDialogEndpoint,
            systemInfo,
        );

        // Get access to linking setup information
        const wrappedDeviceLinkingSetup = endpoint.wrap<DeviceLinkingSetup>(
            deviceLinkingSetup,
            logging.logger('com.device-linking'),
        );
        const {linkingState} = wrappedDeviceLinkingSetup;

        // Helper function for error handling
        // eslint-disable-next-line no-inner-declarations
        async function throwLinkingError(
            message: string,
            type: LinkingStateErrorType,
            error?: Error,
        ): Promise<never> {
            await linkingState.updateState({state: 'error', type, message});
            if (error !== undefined) {
                message += `\n\n${extractErrorTraceback(error)}`;
            }
            log.error(message);
            throw new BackendCreationError('handled-linking-error', message, {from: error});
        }

        // Generate rendezvous setup with all information needed to show the QR code
        let setup: RendezvousProtocolSetup;
        {
            const rendezvousPath = bytesToHex(services.crypto.randomBytes(new Uint8Array(32)));
            const url = config.RENDEZVOUS_SERVER_URL.replaceAll(
                '{prefix4}',
                rendezvousPath.slice(0, 1),
            ).replaceAll('{prefix8}', rendezvousPath.slice(0, 2));
            setup = {
                role: 'initiator',
                ak: randomRendezvousAuthenticationKey(services.crypto),
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
            // Note: This can happen if something with the RendezvousConnection initial setup fails,
            //       or if the initial WebSocket connection cannot be established.
            return await throwLinkingError(
                `Could not instantiate RendezvousConnection: ${error}`,
                {
                    kind: 'connection-error',
                    cause: error instanceof RendezvousCloseError ? error.cause : 'unknown',
                },
                ensureError(error),
            );
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
            return await throwLinkingError(
                `Rendezvous handshake failed: ${error}`,
                {
                    kind: 'rendezvous-error',
                    cause: error instanceof RendezvousCloseError ? error.cause : 'unknown',
                },
                ensureError(error),
            );
        }
        log.info('Rendezvous connection established');
        await linkingState.updateState({
            state: 'nominated',
            rph: connectResult.rph,
        });

        // Set up promises and state handling used in the next steps
        const userPasswordPromise = new ResolvablePromise<string>();
        const syncingPhase = new WritableStore<SyncingPhase>('receiving');
        async function updateSyncingPhase(phase: SyncingPhase): Promise<void> {
            syncingPhase.set(phase);
            if (userPasswordPromise.done) {
                await linkingState.updateState({state: 'syncing', phase});
            }
        }

        // Now that we established the connection and showed the RPH, we can wait for ED to
        // start sending essential data and then run the join protocol.
        // eslint-disable-next-line func-style
        const onBegin = async (): Promise<void> => {
            // Update state and wait for password
            await linkingState.updateState({state: 'waiting-for-password'});

            // Once the password is entered, show "syncing" screen
            wrappedDeviceLinkingSetup.userPassword
                .then(async (password) => {
                    await linkingState.updateState({state: 'syncing', phase: syncingPhase.get()});
                    userPasswordPromise.resolve(password);
                })
                .catch((error) => log.error(`Waiting for userPassword promise failed: ${error}`));
        };
        const joinProtocol = new DeviceJoinProtocol(
            connectResult.connection,
            onBegin,
            logging.logger('backend-controller.join'),
            {crypto: services.crypto, file: services.file},
        );
        let joinResult: DeviceJoinResult;
        try {
            joinResult = await joinProtocol.join();
        } catch (error) {
            if (error instanceof DeviceJoinError && error.type.kind === 'connection') {
                return await throwLinkingError(
                    `Device join protocol failed: ${error.message}`,
                    {kind: 'connection-error', cause: error.type.cause},
                    error,
                );
            }
            return await throwLinkingError(
                `Device join protocol failed: ${error}`,
                {kind: 'join-error'},
                ensureError(error),
            );
        }
        await updateSyncingPhase('restoring');

        // Generate new random database key
        const databaseKey = wrapRawDatabaseKey(
            services.crypto.randomBytes(new Uint8Array(DATABASE_KEY_LENGTH)),
        );
        const databaseKeyForKeyStorage = wrapRawDatabaseKey(databaseKey.unwrap().slice());

        // Create database
        const db = factories.db({config}, logging.logger('db'), databaseKey, false);

        // Create nonces service and import nonces from joinResult
        const nonces = new NonceService(
            {crypto: services.crypto, db, logging},
            new Identity(joinResult.identity),
        );
        log.info(`Importing ${joinResult.cspHashedNonces.size} CSP nonces.`);
        nonces.importNonces(NonceScope.CSP, joinResult.cspHashedNonces);
        log.info(`Importing ${joinResult.d2dHashedNonces.size} D2D nonces.`);
        nonces.importNonces(NonceScope.D2D, joinResult.d2dHashedNonces);

        // Wrap the client key (but keep a copy for the key storage)
        const rawCkForKeyStorage = wrapRawClientKey(joinResult.rawCk.unwrap().slice());
        const ck = SecureSharedBoxFactory.consume(
            services.crypto,
            nonces,
            NonceScope.CSP,
            joinResult.rawCk,
        ) as ClientKey;

        // Look up identity information and server group on directory server
        let privateData;
        try {
            privateData = await services.directory.privateData(joinResult.identity, ck);
        } catch (error) {
            const message = `Fetching information about identity failed: ${error}`;
            if (
                error instanceof DirectoryError &&
                (error.type === 'identity-transfer-prohibited' || error.type === 'invalid-identity')
            ) {
                return await throwLinkingError(message, {kind: error.type}, error);
            }
            return await throwLinkingError(message, {kind: 'generic-error'}, ensureError(error));
        }
        if (privateData.serverGroup !== joinResult.serverGroup) {
            // Because the server group entropy was reduced from 8 to 4 bits a few years ago, it's
            // possible that there are still Threema installations where the old server group is
            // being used. Thus, a mismatch can happen in practice, and it should be a warning, not
            // an error. In case of conflict, the server group from the directory server wins.
            log.warn(
                `Server group reported by directory server (${privateData.serverGroup}) does not match server group received from join protocol (${joinResult.serverGroup})`,
            );
        }

        // Validate Threema Work credentials depending on build variant. The consumer app may not
        // receive credentials, the work app must receive (valid) credentials.
        switch (import.meta.env.BUILD_VARIANT) {
            case 'consumer':
                if (joinResult.workCredentials !== undefined) {
                    return await throwLinkingError(
                        `This is a consumer app, but essential data contains Threema Work credentials for ${joinResult.workCredentials.username}.`,
                        {kind: 'generic-error'},
                    );
                }
                break;
            case 'work': {
                if (joinResult.workCredentials === undefined) {
                    return await throwLinkingError(
                        `This is a Threema Work app, but essential data did not include Threema Work credentials. Ensure that you're using the latest mobile app version.`,
                        {kind: 'generic-error'},
                    );
                }
                if (joinResult.workCredentials.username === '') {
                    return await throwLinkingError('Threema Work credentials username is empty.', {
                        kind: 'invalid-work-credentials',
                    });
                }
                if (joinResult.workCredentials.password === '') {
                    return await throwLinkingError('Threema Work credentials password is empty.', {
                        kind: 'invalid-work-credentials',
                    });
                }

                let licenseCheckResult;
                try {
                    licenseCheckResult = await workLicenseCheck(
                        joinResult.workCredentials,
                        systemInfo,
                        log,
                    );
                } catch (error) {
                    return await throwLinkingError(
                        `Threema Work credentials could not be validated: ${error}`,
                        {kind: 'generic-error'},
                    );
                }
                if (licenseCheckResult.valid) {
                    log.info('Threema Work credentials are valid');
                } else {
                    return await throwLinkingError(
                        `Threema Work credentials are invalid or revoked: ${licenseCheckResult.message}`,
                        {kind: 'invalid-work-credentials'},
                    );
                }

                break;
            }
            default:
                unreachable(import.meta.env.BUILD_VARIANT);
        }

        // Set identity data
        const identityData: IdentityData = {
            identity: joinResult.identity,
            ck,
            serverGroup: privateData.serverGroup,
        };
        const deviceIds: DeviceIds = joinResult.deviceIds;
        const dgk: RawDeviceGroupKey = joinResult.dgk;
        const dgkForKeyStorage = wrapRawDeviceGroupKey(dgk.unwrap().slice());

        // Create backend
        const backendServices = initBackendServices(
            services,
            db,
            identityData,
            deviceIds,
            dgk,
            nonces,
            joinResult.workCredentials,
        );
        const backend = new Backend(backendServices);

        // Initialize database with essential data
        try {
            await joinProtocol.restoreEssentialData(backend.model, identityData.identity);
        } catch (error) {
            return await throwLinkingError(
                `Failed to restore essential data: ${error}`,
                {kind: 'restore-error'},
                ensureError(error),
            );
        }

        // Wait for user password (or connection aborting)
        log.debug('Waiting for user password');
        await updateSyncingPhase('encrypting');
        const userPasswordResult = await taggedRace(
            {tag: 'password', promise: userPasswordPromise},
            {tag: 'join-aborted', promise: joinProtocol.abort.promise},
        );
        if (userPasswordResult.tag === 'join-aborted') {
            // The "aborted" signal was raised before the user password was entered. This means that
            // the rendezvous connection was aborted in the meantime.
            return await throwLinkingError(
                `Device join protocol was aborted while waiting for user password`,
                {kind: 'connection-error', cause: userPasswordResult.value},
            );
        }
        const userPassword = userPasswordResult.value;
        if (userPassword.length === 0) {
            return await throwLinkingError(`Received empty user password`, {kind: 'generic-error'});
        }

        /**
         * Helper function to purge sensitive data.
         */
        function purgeSensitiveData(): void {
            rawCkForKeyStorage.purge();
            dgkForKeyStorage.purge();
            databaseKeyForKeyStorage.purge();
            joinResult.rawCk.purge();
        }

        // Now that essential data is processed, we can connect to the Mediator server and register
        // ourselves
        const initialConnectionResult = await backend.connectionManager.start();
        if (initialConnectionResult.connected) {
            // Write key storage
            await writeKeyStorage(
                services,
                userPassword,
                identityData,
                deviceIds,
                rawCkForKeyStorage,
                dgkForKeyStorage,
                databaseKeyForKeyStorage,
                joinResult.workCredentials,
            );
            purgeSensitiveData();

            // Mark join protocol as complete and update state
            await joinProtocol.complete();
            await linkingState.updateState({state: 'registered'});
        } else {
            // Purge data and report error
            purgeSensitiveData();
            let errorInfo = `Close code ${initialConnectionResult.closeCode}`;
            const closeCodeName = CloseCodeUtils.nameOf(initialConnectionResult.closeCode);
            if (closeCodeName !== undefined) {
                errorInfo += ` (${closeCodeName})`;
            }
            return await throwLinkingError(`Initial connection with server failed: ${errorInfo} `, {
                kind: 'registration-error',
            });
        }

        // Schedule background jobs
        backend._scheduleBackgroundJobs();

        // Expose the backend on a new channel
        const {local, remote} = endpoint.createEndpointPair<BackendHandle>();
        endpoint.exposeProxy(backend, local, logging.logger('com.backend'));
        const transferredRemote: TransferredToRemote<EndpointFor<BackendHandle>> =
            endpoint.transfer(remote, [remote]);
        return transferredRemote;
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

    /**
     * Schedule backend background jobs.
     */
    private _scheduleBackgroundJobs(): void {
        this._log.info('Scheduling background jobs');

        // Schedule license check every 12h
        if (import.meta.env.BUILD_VARIANT === 'work') {
            const workData = this._services.device.workData;
            if (workData !== undefined) {
                setTimeout(() => {
                    this._backgroundJobScheduler.scheduleRecurringJob(
                        (log) => workLicenseCheckJob(workData, this._services, log),
                        'work-license-check',
                        12 * 3600,
                        true,
                    );
                }, 1000);
            }
        }
    }
}

/**
 * The result of the initial server connection.
 */
export type InitialConnectionResult = {connected: true} | {connected: false; closeCode: u53};

/**
 * Connection logger style (white on yellow).
 */
const connectionLoggerStyle = createLoggerStyle('#EE9B00', 'white');

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
 *
 * Note that the connection will only be established once the `readyToConnect` promise is resolved.
 */
class ConnectionManager {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly state: MonotonicEnumStore<ConnectionState>;
    public readonly leaderState: MonotonicEnumStore<D2mLeaderState>;
    private readonly _initialConnectionResult = new ResolvablePromise<InitialConnectionResult>();
    private readonly _log: Logger;
    private _autoConnect: ResolvablePromise<void> = ResolvablePromise.resolve();
    private _connection?: Connection;
    private _started = false;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ) {
        this._log = _services.logging.logger('connection.manager', connectionLoggerStyle);
        this.state = ConnectionStateUtils.createStore(
            MonotonicEnumStore,
            ConnectionState.DISCONNECTED,
            {
                log: _services.logging.logger('connection.state', connectionLoggerStyle),
                tag: 'state',
            },
        );
        this.leaderState = D2mLeaderStateUtils.createStore(
            MonotonicEnumStore,
            D2mLeaderState.NONLEADER,
            {
                log: _services.logging.logger('connection.leaderState', connectionLoggerStyle),
                tag: 'state',
            },
        );

        // After first successful connection, update initial connection result
        const unsubscribeFromState = this.state.subscribe((state) => {
            if (state === ConnectionState.CONNECTED) {
                if (!this._initialConnectionResult.done) {
                    this._initialConnectionResult.resolve({connected: true});
                }
                unsubscribeFromState();
            }
        });
    }

    public get initialConnectionResult(): Promise<InitialConnectionResult> {
        return this._initialConnectionResult;
    }

    /**
     * Start the connection manager
     *
     * This will connect to the server and automatically reconnect on connection loss (unless
     * auto-connect is disabled).
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public start(): Promise<InitialConnectionResult> {
        if (this._started) {
            throw new Error('Started an already-started connection manager');
        }
        this._started = true;
        this._run().catch((error) =>
            assertUnreachable(`Connection manager failed to run: ${error}`),
        );
        return this.initialConnectionResult;
    }

    /**
     * Disable auto-connect. The current connection will be closed (if any).
     */
    public disableAutoConnect(closeCode?: u53): void {
        this._log.debug('Turning off auto-connect');
        this._connection?.disconnect();
        this._autoConnect = new ResolvablePromise();

        // Update initial connection result (if promise is not already resolved)
        if (closeCode !== undefined && !this._initialConnectionResult.done) {
            this._initialConnectionResult.resolve({connected: false, closeCode});
        }
    }

    /**
     * Toggle auto-connect. When auto-connect is turned off, the current connection will be closed.
     */
    public toggleAutoConnect(): void {
        if (this._autoConnect.done) {
            this.disableAutoConnect();
        } else {
            this._log.debug('Turning on auto-connect');
            this._autoConnect.resolve();
        }
    }

    private async _run(): Promise<never> {
        const {model, config, systemDialog} = this._services;
        const reconnectionDelayMs = config.MEDIATOR_RECONNECTION_DELAY_S * 1000;
        let skipConnectionDelay = false;
        for (;;) {
            // Check if we should (re)connect.
            if (!this._autoConnect.done) {
                this._log.debug(
                    'Auto-connect currently disabled. Waiting until auto-connect has been re-enabled.',
                );
            }
            await this._autoConnect;

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
                                'Waiting for user interaction before re-enabling auto-connect',
                            );
                            const action = await handle.closed;
                            // eslint-disable-next-line max-depth
                            switch (action) {
                                case 'confirmed': // Reconnect
                                    skipConnectionDelay = true;
                                    break;
                                case 'cancelled':
                                    this.disableAutoConnect(closeInfo.code);
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

                            this.disableAutoConnect(closeInfo.code);
                        }
                        break;
                    case CloseCode.DEVICE_DROPPED:
                    case CloseCode.EXPECTED_DEVICE_SLOT_STATE_MISMATCH:
                        // Both cases happen for the same reason (another device dropped us from the multi-device group)
                        // but DEVICE_DROPPED happens while we are connected, and EXPECTED_DEVICE_SLOT_STATE_MISMATCH
                        // when the dropping happened while we were offline and we are trying to reconnect.

                        // Check if device was dropped because of unrecoverable state.
                        if (
                            model.globalProperties.get('applicationState')?.get().view.value
                                .unrecoverableStateDetected === true
                        ) {
                            this._log.error(
                                'Connection not established: Device is dropped due to unrecoverable application state',
                            );

                            void systemDialog.open({
                                type: 'unrecoverable-state',
                            });
                        } else {
                            this._log.error(
                                `Connection not established: ${CloseCodeUtils.nameOf(
                                    closeInfo.code,
                                )}`,
                            );
                            // If we get this close code and have never connected before,
                            // this means we are registered on the Mediator without knowing it.
                            if (
                                closeInfo.code === CloseCode.EXPECTED_DEVICE_SLOT_STATE_MISMATCH &&
                                model.globalProperties
                                    .get(GlobalPropertyKey.LAST_MEDIATOR_CONNECTION)
                                    ?.get().view.value.date === undefined
                            ) {
                                void systemDialog.open({
                                    type: 'connection-error',
                                    context: {
                                        type: 'device-slot-state-mismatch',
                                        userCanReconnect: false,
                                        clientExpectedState: 'new',
                                    },
                                });
                            } else {
                                void systemDialog.open({
                                    type: 'connection-error',
                                    context: {
                                        type: 'client-was-dropped',
                                        userCanReconnect: false,
                                    },
                                });
                            }
                        }

                        this.disableAutoConnect(closeInfo.code);
                        break;
                    case CloseCode.DEVICE_LIMIT_REACHED:
                    case CloseCode.DEVICE_ID_REUSED:
                    case CloseCode.REFLECTION_QUEUE_LENGTH_LIMIT_REACHED:
                        // TODO(DESK-487): Request user interaction to continue
                        this.disableAutoConnect(closeInfo.code);
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
                this.disableAutoConnect(closeInfo.code);
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

                // In practise, we observe very rare time jumps in connection with stand-by on MacOS.
                // Therefore, we clamp the values to a sane range to avoid very long reconnect timeouts.
                const waitMs = Math.min(
                    elapsedMs > reconnectionDelayMs ? 0 : reconnectionDelayMs - elapsedMs,
                    reconnectionDelayMs,
                );
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
 * Platform details, e.g. "Firefox 91"
 */
function makeD2mPlatformDetails(browserInfo: BrowserInfo, systemInfo: SystemInfo): string {
    let details = browserInfo.name;
    if (browserInfo.version !== undefined) {
        details += ` ${browserInfo.version}`;
    }
    switch (systemInfo.os) {
        case 'linux':
            details += ' on Linux';
            break;
        case 'macos':
            details += ' on macOS';
            break;
        case 'windows':
            details += ' on Windows';
            break;
        case 'other':
            break;
        default:
            unreachable(systemInfo.os);
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
        const {
            config,
            crypto,
            device,
            logging,
            model: {user},
        } = services;
        const log = logging.logger(`connection.${taskManager.id}`, connectionLoggerStyle);
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
        const abort = new AbortRaiser<{readonly cause: string}>();
        const delayedConnection = Delayed.simple<ConnectionHandle>(
            'Tried to access connection handle before connected',
            'Connection handle has already been set',
        );
        const browserInfo = getBrowserInfo(self.navigator.userAgent);
        const cspClientInfo = makeCspClientInfo(browserInfo, services.systemInfo);
        const d2mPlatformDetails = makeD2mPlatformDetails(browserInfo, services.systemInfo);
        log.debug(`CSP client info string: ${cspClientInfo}`);
        const controller = new ProtocolController(
            services,
            taskManager,
            delayedConnection,
            abort.listener,
            // CSP
            {
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
                dgpk: device.d2m.dgpk,
                dgdik: device.d2m.dgdik,
                deviceId: device.d2m.deviceId,
                deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy.PERSISTENT,
                platformDetails: d2mPlatformDetails,
                label: user.devicesSettings.get().view.deviceName,
            },
            // D2D
            {
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
                log.warn('Leader state promise errored', error);
                abort.raise({cause: 'Leader state promise errored'});
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
        const prefix = byteToHex(unwrap(device.d2m.dgpk.public[0]));
        const url = config.MEDIATOR_SERVER_URL.replaceAll(
            '{prefix4}',
            unwrap(prefix[0]),
        ).replaceAll('{prefix8}', prefix);
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
            .then((info) => {
                log.info('Mediator transport closed cleanly:', info);
                abort.raise({cause: 'Mediator transport closed cleanly'});
            })
            .catch((error) => {
                log.warn('Mediator transport closed with error:', error);
                abort.raise({cause: 'Mediator transport closed with error'});
            })
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
            .then(() => {
                log.warn('Mediator transport readable pipe detached');
                abort.raise({cause: 'Mediator transport readable pipe detached'});
            })
            .catch((error) => {
                log.warn('Mediator transport readable side errored:', error);
                abort.raise({cause: 'Mediator transport readable side errored'});
            });
        pipe.writable
            .then(() => {
                log.warn('Mediator transport writable side detached');
                abort.raise({cause: 'Mediator transport writable side detached'});
            })
            .catch((error) => {
                log.warn('Mediator transport writable side errored:', error);
                abort.raise({cause: 'Mediator transport writable side errored'});
            });
        connectionState.set(ConnectionState.HANDSHAKE);

        // Run the task manager
        controller.taskManager
            .run(services, controller, abort.listener)
            .then((v) => {
                abort.raise({cause: 'Task manager stopped'});
                unreachable(v, new Error('Task manager stopped'));
            })
            .catch((error) => {
                if (error instanceof ConnectionClosed) {
                    log.info('Task manager stopped due to connection being closed', error);
                } else {
                    log.error('Task manager errored:', error);
                }
            });

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
