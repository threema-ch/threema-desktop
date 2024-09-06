import type {
    EarlyBackendServices,
    EarlyBackendServicesThatDontRequireConfig,
    EarlyBackendServicesThatRequireConfig,
    ServicesForBackend,
} from '~/common/backend';
import {BackgroundJobScheduler} from '~/common/background-job-scheduler';
import type {Compressor} from '~/common/compressor';
import {
    type Config,
    createConfigFromOppf,
    createDefaultConfig,
    STATIC_CONFIG,
} from '~/common/config';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import {NonceService} from '~/common/crypto/nonce';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {
    DATABASE_KEY_LENGTH,
    type DatabaseBackend,
    type RawDatabaseKey,
    type ServicesForDatabaseFactory,
    wrapRawDatabaseKey,
} from '~/common/db';
import {
    DeviceBackend,
    type DeviceIds,
    type IdentityData,
    type ThreemaWorkData,
} from '~/common/device';
import {workLicenseCheckJob} from '~/common/dom/backend/background-jobs';
import {DeviceJoinProtocol, type DeviceJoinResult} from '~/common/dom/backend/join';
import * as oppf from '~/common/dom/backend/onprem/oppf';
import {OPPF_FILE_SCHEMA} from '~/common/dom/backend/onprem/oppf';
import {unlockDatabaseKey, transferOldMessages} from '~/common/dom/backend/restore-db';
import {updateCheck} from '~/common/dom/backend/update-check';
import {randomBytes} from '~/common/dom/crypto/random';
import {DebugBackend} from '~/common/dom/debug';
import {ConnectionManager} from '~/common/dom/network/protocol/connection';
import {FetchBlobBackend} from '~/common/dom/network/protocol/fetch-blob';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {FetchSfuHttpBackend} from '~/common/dom/network/protocol/fetch-sfu';
import {FetchWorkBackend} from '~/common/dom/network/protocol/fetch-work';
import {
    RendezvousConnection,
    type RendezvousProtocolSetup,
} from '~/common/dom/network/protocol/rendezvous';
import type {SystemInfo} from '~/common/electron-ipc';
import {CloseCodeUtils, ConnectionState, NonceScope, TransferTag} from '~/common/enum';
import {
    BaseError,
    type BaseErrorOptions,
    DeviceJoinError,
    extractErrorTraceback,
    RendezvousCloseError,
    extractErrorMessage,
} from '~/common/error';
import type {FileStorage, ServicesForFileStorageFactory} from '~/common/file-storage';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ThreemaWorkCredentials} from '~/common/internal-protobuf/key-storage-file';
import {
    type KeyStorage,
    type KeyStorageContents,
    KeyStorageError,
    type ServicesForKeyStorageFactory,
    type KeyStorageOppfConfig,
} from '~/common/key-storage';
import {LoadingInfo} from '~/common/loading';
import type {Logger, LoggerFactory} from '~/common/logging';
import {BackendMediaService, type IFrontendMediaService} from '~/common/media';
import type {Repositories} from '~/common/model';
import {ModelRepositories} from '~/common/model/repositories';
import {
    type DisplayPacket,
    type PacketMeta,
    RAW_CAPTURE_CONVERTER,
    type RawCaptureHandlers,
    type RawPacket,
} from '~/common/network/protocol/capture';
import {type DirectoryBackend, DirectoryError} from '~/common/network/protocol/directory';
import {PersistentProtocolStateBackend} from '~/common/network/protocol/persistent-protocol-state';
import type {RendezvousCloseCause} from '~/common/network/protocol/rendezvous';
import {TaskManager} from '~/common/network/protocol/task/manager';
import {VolatileProtocolStateBackend} from '~/common/network/protocol/volatile-protocol-state';
import {StubWorkBackend, type WorkBackend} from '~/common/network/protocol/work';
import {ensureDeviceCookie, type DeviceCookie} from '~/common/network/types';
import {
    type ClientKey,
    randomRendezvousAuthenticationKey,
    type RawClientKey,
    type RawDeviceGroupKey,
    wrapRawClientKey,
    wrapRawDeviceGroupKey,
} from '~/common/network/types/keys';
import type {DbMigrationSupplements} from '~/common/node/db/migrations';
import {type NotificationCreator, NotificationService} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import type {TestDataJson} from '~/common/test-data';
import type {DomainCertificatePin, ReadonlyUint8Array, u53} from '~/common/types';
import {
    assertError,
    assertUnreachable,
    ensureError,
    unreachable,
    unwrap,
} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';
import {bytesToHex, hexToBytes} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {
    type EndpointService,
    PROXY_HANDLER,
    type ProxyMarked,
    registerErrorTransferHandler,
    type Remote,
    type ProxyEndpoint,
} from '~/common/utils/endpoint';
import {Identity} from '~/common/utils/identity';
import {u64ToHexLe} from '~/common/utils/number';
import {taggedRace, type ReusablePromise} from '~/common/utils/promise';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {
    type LocalStore,
    type StoreDeactivator,
    WritableStore,
    type IQueryableStore,
    type IWritableStore,
} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {ensureStoreValue} from '~/common/utils/store/helpers';
import {type IViewModelRepository, ViewModelRepository} from '~/common/viewmodel';
import {ViewModelCache} from '~/common/viewmodel/cache';
import type {WebRtcService} from '~/common/webrtc';

/**
 * Max number of allowed disconnects at startup before skipping the loading screen entirely.
 */
const MAX_DISCONNECTS_THRESHOLD = 1;

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
    | 'key-storage-error-wrong-password'
    | 'onprem-configuration-error'
    | 'missing-work-credentials';

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
    readonly mediaEndpoint: ProxyEndpoint<IFrontendMediaService>;
    readonly notificationEndpoint: ProxyEndpoint<NotificationCreator>;
    readonly systemDialogEndpoint: ProxyEndpoint<SystemDialogService>;
    readonly webRtcEndpoint: ProxyEndpoint<WebRtcService>;
    readonly systemInfo: SystemInfo;
}

/**
 * Interface exposed by the worker towards the backend controller. It is used to instantiate the
 * backend in the context of the worker.
 */
export interface BackendCreator extends ProxyMarked {
    /** Return whether or not an identity (i.e. a key storage file) is present. */
    readonly hasIdentity: () => boolean;

    /** Instantiate backend from an existing key storage. */
    readonly fromKeyStorage: (
        init: Remote<BackendInit>,
        userPassword: string,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
    ) => Promise<ProxyEndpoint<BackendHandle>>;

    /** Instantiate backend through the device join protocol. */
    readonly fromDeviceJoin: (
        init: Remote<BackendInit>,
        deviceLinkingSetup: ProxyEndpoint<DeviceLinkingSetup>,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        oldProfileRemover: ProxyEndpoint<OldProfileRemover>,
        shouldRestoreOldMessages: boolean,
    ) => Promise<ProxyEndpoint<BackendHandle>>;

    /** Instantiate backend from an existing test configuration. */
    readonly fromTestConfiguration: (
        init: Remote<BackendInit>,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
        testData: TestDataJson,
    ) => Promise<ProxyEndpoint<BackendHandle>>;
}

/**
 * Service factories needed for a backend worker.
 */
export interface FactoriesForBackend {
    /** Instantiate logger factory. */
    readonly logging: (rootTag: string, defaultStyle: string) => LoggerFactory;
    /** Instantiate key storage. */
    readonly keyStorage: (
        services: ServicesForKeyStorageFactory,
        log: Logger,
        loadFromOldProfile?: boolean,
    ) => KeyStorage;
    /** Instantiate file storage. */
    readonly fileStorage: (
        services: ServicesForFileStorageFactory,
        log: Logger,
        loadFromOldProfile?: boolean,
    ) => FileStorage;
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
        supplementaryMigrationInformation: DbMigrationSupplements,
        key: RawDatabaseKey,
        shouldExist: boolean,
        loadFromOldProfile?: boolean,
    ) => DatabaseBackend;
}

/**
 * Linking state error sub-types.
 *
 * - connection-error: Failed to connect to the rendezvous server (or the connection aborted).
 * - rendezvous-error: The rendezvous protocol did not succeed.
 * - join-error: The device join protocol did not succeed.
 * - restore-error: Restoring essential data did not succeed.
 * - identity-transfer-prohibited: Restoring failed because user tried to link a Threema Work ID
 *   with the consumer build variant, or vice versa.
 * - invalid-identity: Restoring failed because user identity is unknown or revoked.
 * - invalid-work-credentials: Restoring failed because user's Threema Work credentials are invalid
 *   or expired.
 * - registration-error: Initial registration at Mediator server failed.
 * - generic-error: Some other error during linking.
 * - onprem-configuration-error: An error when parsing or verifying the onprem configuration file.
 * - old-messages-restoration-error: An error when trying to restore the messages from an old
 *   profile.
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
    | {readonly kind: 'generic-error'}
    | {readonly kind: 'onprem-configuration-error'}
    | {readonly kind: 'old-messages-restoration-error'};

export type SyncingPhase = 'receiving' | 'loading' | 'encrypting' | 'restoring';

/**
 * Matches the interface in `ui/linking/index.ts`
 */
export interface OppfFetchConfig {
    readonly password: string;
    readonly username: string;
    readonly oppfUrl: string;
}

export type LoadingState =
    | {
          state: // Not ready to initialize yet (e.g., because we don't know whether the key storage is
          // unlocked).
          | 'pending'
              // Loading screen is about to be displayed, but reflection queue processing has not
              // started yet.
              | 'initializing'
              // Reflection queue processing has been cancelled (probably due to a missing internet
              // connection).
              | 'cancelled'
              // Reflection queue processing has successfully finished.
              | 'ready';
      }
    | {
          readonly state: 'processing-reflection-queue';
          readonly reflectionQueueLength: u53;
          readonly reflectionQueueProcessed: u53;
      };

/**
 * The backend's linking state.
 */
export type LinkingState =
    /**
     * Initial state.
     */
    | {readonly state: 'initializing'}
    /**
     * An OnPrem build is waiting for OPPF URL and credentials to be entered, and for the OPPF contents to be fetched and validated.
     */
    | {readonly state: 'oppf'}
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
     * Let the user enter the password of an old profile that was found to restore its messages.
     */
    | {
          readonly state: 'waiting-for-old-profile-password';
          readonly previouslyEnteredPassword?: string;
          readonly type:
              | 'default'
              // Old profile restore was already skipped.
              | 'skipped'
              // Old password is currently being tried and the profile is being restored.
              | 'restoring';
      }
    /**
     * If the user tried to restore messages from another ID, let them restart or continue without
     * messages.
     */
    | {
          readonly state: 'restoration-identity-mismatch';
      }
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

export interface LoadingStateSetup extends ProxyMarked {
    /**
     * State updates sent from the backend to the frontend.
     */
    readonly loadingState: {
        readonly store: WritableStore<LoadingState>;
        readonly updateState: (state: LoadingState) => void;
    } & ProxyMarked;
}

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

    /**
     * A reusable promise that will be resolved when the user entered a password for their old
     * profile.
     */
    readonly oldProfilePassword: ReusablePromise<string | undefined>;

    /**
     * A promise that will be fulfilled by the frontend when the user continues without restoring
     * messages when they linked with a different identity.
     */
    readonly continueWithoutRestoring: Promise<void>;

    /**
     * A promise that will be fulfilled by the frontend when the user has entered a oppf url
     */
    readonly oppfConfig: Promise<OppfFetchConfig>;
}

export interface PinForwarder extends ProxyMarked {
    readonly forward: (pins: DomainCertificatePin[] | undefined) => void;
}

export interface OldProfileRemover extends ProxyMarked {
    readonly remove: () => void;
}

/**
 * Create an instance of the NotificationService, wrapping a remote endpoint.
 */
function createNotificationService(
    endpoint: EndpointService,
    notificationCreator: ProxyEndpoint<NotificationCreator>,
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
 * Create an instance of the {@link BackendMediaService} by wrapping an endpoint for the
 * {@link IFrontendMediaService}.
 */
function createMediaService(
    endpoint: EndpointService,
    frontendMediaService: ProxyEndpoint<IFrontendMediaService>,
    logging: LoggerFactory,
): BackendMediaService {
    const frontendMediaServiceEndpoint = endpoint.wrap<IFrontendMediaService>(
        frontendMediaService,
        logging.logger('com.frontend-media-service'),
    );
    return new BackendMediaService(
        logging.logger('bw.backend.media'),
        frontendMediaServiceEndpoint,
    );
}

/**
 * Initialize those backend services that require neither an active identity nor a dynamic config
 * for being initialized.
 */
function initEarlyBackendServicesWithoutConfig(
    factories: FactoriesForBackend,
    {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
    backendInit: BackendInit,
): EarlyBackendServicesThatDontRequireConfig {
    const crypto = new TweetNaClBackend(randomBytes);
    const {mediaEndpoint: frontendMediaServiceEndpoint, notificationEndpoint} = backendInit;
    const compressor = factories.compressor();
    const notification = createNotificationService(endpoint, notificationEndpoint, logging);
    const media = createMediaService(endpoint, frontendMediaServiceEndpoint, logging);
    const systemDialog = endpoint.wrap(
        backendInit.systemDialogEndpoint,
        logging.logger('com.system-dialog'),
    );
    const taskManager = new TaskManager({logging});
    const keyStorage = factories.keyStorage({crypto}, logging.logger('key-storage'));
    const volatileProtocolState = new VolatileProtocolStateBackend();
    const webrtc = endpoint.wrap(backendInit.webRtcEndpoint, logging.logger('com.webrtc'));

    return {
        compressor,
        crypto,
        endpoint,
        keyStorage,
        logging,
        media,
        notification,
        systemDialog,
        systemInfo: backendInit.systemInfo,
        taskManager,
        volatileProtocolState,
        webrtc,
    };
}

/**
 * Initialize the backend services that don't require an active identity, but a dynamic config for
 * being intialized.
 */
function initEarlyBackendServicesWithConfig(
    factories: FactoriesForBackend,
    {config, crypto, logging}: Pick<ServicesForBackend, 'crypto' | 'config' | 'logging'>,
    workData: IQueryableStore<ThreemaWorkData | undefined> | undefined,
): EarlyBackendServicesThatRequireConfig {
    const file = factories.fileStorage({config, crypto}, logging.logger('storage'));
    const directory = new FetchDirectoryBackend(
        {config, logging},
        workData === undefined
            ? undefined
            : derive([workData], ([{currentValue: data}]) => data?.workCredentials),
    );
    const sfu = new FetchSfuHttpBackend({config, logging});

    return {
        directory,
        file,
        sfu,
    };
}

/**
 * Init the full backend services.
 *
 * Note: The {@link dgk} will be consumed and purged after initialization!
 */
function initBackendServices(
    earlyServices: EarlyBackendServices,
    db: DatabaseBackend,
    identityData: IdentityData,
    deviceIds: DeviceIds,
    deviceCookie: DeviceCookie | undefined,
    dgk: RawDeviceGroupKey,
    nonces: NonceService,
    workData: IQueryableStore<ThreemaWorkData> | undefined,
): ServicesForBackend {
    const {
        config,
        crypto,
        directory,
        endpoint,
        file,
        logging,
        media,
        notification,
        sfu,
        systemDialog,
        taskManager,
        volatileProtocolState,
        webrtc,
    } = earlyServices;

    const device = new DeviceBackend(
        {crypto, db, logging, nonces},
        identityData,
        deviceIds,
        deviceCookie,
        dgk,
        workData,
    );
    const persistentProtocolState = new PersistentProtocolStateBackend({db, logging});
    const blob = new FetchBlobBackend({config, device, directory});
    const loadingInfo = new LoadingInfo(logging.logger('loading-info'));
    const model = new ModelRepositories({
        blob,
        config,
        crypto,
        db,
        device,
        directory,
        endpoint,
        file,
        loadingInfo,
        logging,
        media,
        nonces,
        notification,
        sfu,
        taskManager,
        systemDialog,
        persistentProtocolState,
        volatileProtocolState,
        webrtc,
    });
    const viewModel = new ViewModelRepository(
        {model, config, crypto, endpoint, file, logging, device},
        new ViewModelCache(),
    );
    return {
        ...earlyServices,
        blob,
        device,
        loadingInfo,
        model,
        nonces,
        persistentProtocolState,
        viewModel,
        volatileProtocolState,
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
    deviceCookie: DeviceCookie | undefined,
    ck: RawClientKey,
    dgk: RawDeviceGroupKey,
    databaseKey: RawDatabaseKey,
    workCredentials?: ThreemaWorkCredentials,
    onPremConfig?: KeyStorageOppfConfig,
): Promise<void> {
    try {
        await keyStorage.write(password, {
            schemaVersion: 2,
            identityData: {
                identity: identityData.identity,
                ck,
                serverGroup: identityData.serverGroup,
            },
            deviceCookie,
            dgk,
            databaseKey,
            deviceIds: {...deviceIds},
            workCredentials: workCredentials === undefined ? undefined : {...workCredentials},
            onPremConfig: onPremConfig === undefined ? undefined : {...onPremConfig},
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
 * Backend functionality exposed to the UI thread.
 *
 * IMPORTANT: The UI thread should only have very constrained access to specific high-level parts of
 * the backend directly. Low-level APIs must not be exposed. The UI should not be granted access to
 * internal values that it does not need access to. Whenever a property from the {@link Backend}
 * needs to be requested for the sole purpose of forwarding it into a function call to the
 * {@link Backend}, that API should not be exposed!
 */
export interface BackendHandle extends ProxyMarked {
    readonly capture: () => LocalStore<DisplayPacket | undefined>;
    readonly connectionManager: ConnectionManager;
    readonly debug: DebugBackend;
    readonly deviceIds: DeviceIds;
    readonly directory: Pick<DirectoryBackend, 'identity'>;
    readonly keyStorage: Pick<KeyStorage, 'changePassword' | 'changeWorkCredentials'>;
    readonly model: Repositories;
    readonly viewModel: IViewModelRepository;
    readonly work: WorkBackend;
}

/**
 * The backend combines all required services and contains the core logic of our application.
 *
 * The backend lives in the worker thread. Its {@link BackendHandle} is exposed to the UI thread
 * through the {@link BackendController}.
 */
export class Backend {
    public readonly handle: BackendHandle;

    private readonly _log: Logger;
    private readonly _backgroundJobScheduler: BackgroundJobScheduler;
    private readonly _connectionManager: ConnectionManager;
    private readonly _debug: DebugBackend;
    private _capture?: RawCaptureHandlers;

    private constructor(private readonly _services: ServicesForBackend) {
        this._log = _services.logging.logger('backend');
        this._backgroundJobScheduler = new BackgroundJobScheduler(_services.logging);
        this._connectionManager = new ConnectionManager(_services, () => this._capture);
        this._debug = new DebugBackend(_services);
        this.handle = {
            [TRANSFER_HANDLER]: PROXY_HANDLER,
            capture: this.capture.bind(this),
            connectionManager: this._connectionManager,
            debug: this._debug,
            deviceIds: {
                cspDeviceId: _services.device.csp.deviceId,
                d2mDeviceId: _services.device.d2m.deviceId,
            },
            directory: _services.directory,
            model: _services.model,
            keyStorage: _services.keyStorage,
            viewModel: _services.viewModel,
            work: _services.work,
        };
        // Log IDs
        {
            const dgid = bytesToHex(_services.device.d2m.dgpk.public);
            const d2m = u64ToHexLe(_services.device.d2m.deviceId);
            const csp = u64ToHexLe(_services.device.csp.deviceId);
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
        {logging}: Pick<ServicesForBackend, 'logging'>,
    ): boolean {
        const log = logging.logger('backend.create');

        const crypto = new TweetNaClBackend(randomBytes);
        const keyStorage = factories.keyStorage({crypto}, logging.logger('key-storage'));
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
     * @param backendInit {BackendInit} Data required to be supplied to a backend worker for
     *   initialization.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param keyStoragePassword The password used to unlock the key storage.
     * @returns A remote BackendHandle that can be used by the backend controller to access the
     *   backend worker.
     */
    public static async createFromKeyStorage(
        backendInit: BackendInit,
        factories: FactoriesForBackend,
        {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
        keyStoragePassword: string,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
    ): Promise<ProxyEndpoint<BackendHandle>> {
        const log = logging.logger('backend.create.from-keystorage');
        log.info('Creating backend from existing key storage');

        // Initialize services that are needed early
        const phase1Services = initEarlyBackendServicesWithoutConfig(
            factories,
            {endpoint, logging},
            backendInit,
        );

        const {loadingState} = endpoint.wrap<LoadingStateSetup>(
            loadingStateSetup,
            logging.logger('com.loading-screen'),
        );

        const wrappedPinForwarder = endpoint.wrap<PinForwarder>(
            pinForwarder,
            logging.logger('com.pin-forwarding'),
        );

        // Try to read the credentials from the key storage.
        //
        // TODO(DESK-383): We might need to move this whole section into a pre-step
        //                 before the backend is actually attempted to be created.
        let keyStorageContents: KeyStorageContents;
        try {
            keyStorageContents = await phase1Services.keyStorage.read(keyStoragePassword);
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

        // Now that we know that the key storage is readable and the password is correct, we're able
        // to initialize the loading screen.
        await loadingState.updateState({
            state: 'initializing',
        });

        // In OnPrem builds, the config needs to be initialized based on the OPPF (On-Prem Provisioning File).
        // In other builds, the config is static.
        let config: Config;
        // Whether or not to check if updates are available on the Threema Servers. Will be false if
        // this is an OnPrem build and the .oppf file specifies not to check for updates.
        let checkForUpdates: boolean = true;
        if (
            import.meta.env.BUILD_ENVIRONMENT === 'onprem' &&
            keyStorageContents.onPremConfig !== undefined
        ) {
            try {
                const workCredentials = unwrap(
                    keyStorageContents.workCredentials,
                    'Missing work credentials in OnPrem build',
                );

                // Download and verify OPPF from OnPrem server
                let oppfFile;
                try {
                    oppfFile = await this._fetchAndVerifyOppfFile(phase1Services, {
                        password: workCredentials.password,
                        username: workCredentials.username,
                        oppfUrl: keyStorageContents.onPremConfig.oppfUrl,
                    });
                } catch (error) {
                    log.warn(
                        'Unable to fetch/decode/verify OPPF file, falling back to the cached OnPrem configuration',
                        error,
                    );
                }
                if (oppfFile !== undefined) {
                    // Valid OPPF config found! Use it and cache it in the key storage.
                    phase1Services.keyStorage
                        .changeCachedOnPremConfig(keyStoragePassword, {
                            oppfUrl: keyStorageContents.onPremConfig.oppfUrl,
                            lastUpdated: BigInt(new Date().getUTCMilliseconds()),
                            oppfCachedConfig: oppfFile.string,
                        })
                        .catch((error: unknown) =>
                            log.error(
                                `Failed to cache OnPrem config: ${extractErrorMessage(ensureError(error), 'short')}`,
                            ),
                        );
                } else {
                    // OPPF could not be fetched or is not valid. Use cached version instead.
                    oppfFile = {
                        parsed: OPPF_FILE_SCHEMA.parse(
                            JSON.parse(keyStorageContents.onPremConfig.oppfCachedConfig),
                        ),
                        string: keyStorageContents.onPremConfig.oppfCachedConfig,
                    };
                }

                await wrappedPinForwarder.forward(oppfFile.parsed.publicKeyPinning);
                config = createConfigFromOppf(oppfFile.parsed);
                checkForUpdates = oppfFile.parsed.updates?.desktop?.autoUpdate === true;
            } catch (error) {
                throw new BackendCreationError(
                    'onprem-configuration-error',
                    'The creation of the backend failed because the fetched and the cached OnPrem Configuration were not valid',
                    {from: error},
                );
            }
        } else {
            config = createDefaultConfig();
        }

        if (!import.meta.env.DEBUG && checkForUpdates) {
            updateCheck(phase1Services, phase1Services.systemInfo).catch(assertUnreachable);
        }

        const workData =
            import.meta.env.BUILD_VARIANT === 'work'
                ? phase1Services.keyStorage.workData
                : undefined;

        // Check for unrecoverable problems
        if (import.meta.env.BUILD_VARIANT === 'work' && workData?.get() === undefined) {
            // The work app requires work credentials. Older versions of the app did not yet sync
            // and store these fields. Thus, enforce this requirement here.
            throw new BackendCreationError(
                'missing-work-credentials',
                'This is a work app, but no work data was found. Profile should be relinked.',
            );
        }

        // Initialise the remaining services
        const phase2Services = {
            ...initEarlyBackendServicesWithConfig(factories, {...phase1Services, config}, workData),
            config,
            work:
                import.meta.env.BUILD_VARIANT === 'work'
                    ? new FetchWorkBackend({config, logging, systemInfo: backendInit.systemInfo})
                    : new StubWorkBackend(),
        };

        // Open database
        const db = factories.db(
            {config},
            logging.logger('db'),
            {userIdentity: keyStorageContents.identityData.identity},
            keyStorageContents.databaseKey,
            true,
        );

        // Create nonces service
        const nonces = new NonceService(
            {crypto: phase1Services.crypto, db, logging},
            new Identity(keyStorageContents.identityData.identity),
        );

        // Extract identity data from key storage
        const identityData = {
            identity: keyStorageContents.identityData.identity,
            ck: SecureSharedBoxFactory.consume(
                phase1Services.crypto,
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
            {...phase1Services, ...phase2Services},
            db,
            identityData,
            deviceIds,
            keyStorageContents.deviceCookie !== undefined
                ? ensureDeviceCookie(keyStorageContents.deviceCookie)
                : undefined,
            dgk,
            nonces,
            import.meta.env.BUILD_VARIANT === 'work'
                ? ensureStoreValue(unwrap(workData))
                : undefined,
        );
        const backend = new Backend(backendServices);

        if (backendServices.device.csp.deviceCookie === undefined) {
            backendServices.systemDialog
                .openOnce({type: 'missing-device-cookie'})
                .catch(assertUnreachable);
        }

        // Subscribe reflection queue to update loading screen.
        backendServices.loadingInfo.loadedStore.subscribe((value) => {
            if (value !== 0) {
                backend._connectionManager
                    .reflectionQueueLength()
                    .then(async (reflectionQueueLength) => {
                        log.info(
                            `Processed ${value} message(s) of total reflection queue length of ${reflectionQueueLength}`,
                        );
                        await loadingState.updateState({
                            state: 'processing-reflection-queue',
                            reflectionQueueLength,
                            reflectionQueueProcessed: value,
                        });
                    })
                    .catch(assertUnreachable);
            }
        });

        // Start connection
        backend._connectionManager.start().catch(() => {
            // This fires when the first connection exits with an error. We can totally ignore it.
        });

        let disconnects = 0;
        backend._connectionManager.state.subscribe((state) => {
            switch (state) {
                case ConnectionState.DISCONNECTED:
                    if (++disconnects > MAX_DISCONNECTS_THRESHOLD) {
                        log.warn('Disconnect threshold reached, skipping loading screen');
                        loadingState
                            .updateState({
                                state: 'cancelled',
                            })
                            .catch(assertUnreachable);
                    }
                    break;

                case ConnectionState.CONNECTED:
                    backend._connectionManager
                        .reflectionQueueDry()
                        .then(async () => {
                            await loadingState.updateState({
                                state: 'ready',
                            });
                        })
                        .catch(assertUnreachable);
                    break;

                default:
                    break;
            }
        });

        // Schedule background jobs
        backend._scheduleBackgroundJobs();

        // Expose the backend on a new channel
        const {local, remote} = endpoint.createEndpointPair<BackendHandle>();
        endpoint.exposeProxy(backend.handle, local, logging.logger('com.backend'));
        // eslint-disable-next-line @typescript-eslint/return-await
        return endpoint.transfer(remote, [remote]);
    }

    public static async createFromTestConfiguration(
        backendInit: BackendInit,
        factories: FactoriesForBackend,
        {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        loadingStateSetup: ProxyEndpoint<LoadingStateSetup>,
        {profile, serverGroup, deviceIds, deviceCookie}: TestDataJson,
    ): Promise<ProxyEndpoint<BackendHandle>> {
        // Initialize services that are needed early
        const phase1Services = initEarlyBackendServicesWithoutConfig(
            factories,
            {endpoint, logging},
            backendInit,
        );

        // Generate new random database key and keep a copy for key storage
        const databaseKey = wrapRawDatabaseKey(
            phase1Services.crypto.randomBytes(new Uint8Array(DATABASE_KEY_LENGTH)),
        );
        const databaseKeyForKeyStorage = wrapRawDatabaseKey(databaseKey.unwrap().slice());

        // Create database
        const config = createDefaultConfig();
        const db = factories.db(
            {config},
            logging.logger('db'),
            {userIdentity: profile.identity},
            databaseKey,
            false,
        );

        // Create nonces service
        const nonces = new NonceService(
            {crypto: phase1Services.crypto, db, logging},
            new Identity(profile.identity),
        );

        // Wrap the client key and keep a copy for key storage
        const rawClientKey = wrapRawClientKey(hexToBytes(profile.privateKey));
        const rawClientKeyForKeyStorage = wrapRawClientKey(rawClientKey.unwrap().slice());

        // Create new identity data
        const identityData: IdentityData = {
            identity: profile.identity,
            ck: SecureSharedBoxFactory.consume(
                phase1Services.crypto,
                nonces,
                NonceScope.CSP,
                rawClientKey,
            ) as ClientKey,
            serverGroup,
        };

        // Generate new random device group key
        const dgkForKeyStorage: RawDeviceGroupKey = wrapRawDeviceGroupKey(
            phase1Services.crypto.randomBytes(new Uint8Array(32)),
        );

        await writeKeyStorage(
            phase1Services,
            profile.keyStoragePassword,
            identityData,
            deviceIds,
            deviceCookie,
            rawClientKeyForKeyStorage,
            dgkForKeyStorage,
            databaseKeyForKeyStorage,
        );

        return await Backend.createFromKeyStorage(
            backendInit,
            factories,
            {endpoint, logging},
            profile.keyStoragePassword,
            pinForwarder,
            loadingStateSetup,
        );
    }

    /**
     * Create an instance of the backend worker for a new identity. This will start the device
     * linking flow.
     *
     * @param backendInit {BackendInit} Data required to be supplied to a backend worker for
     *   initialization.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param deviceLinkingSetup Information needed for the device linking flow.
     * @param pinForwarder Function that forwards public key pins fetched from an .oppf file to electron through ipc (in onPrem builds).
     * @param oldProfileRemover Function that signals electron to remove old profiles from the file system through ipc
     * @param shouldRestoreOldMessages Whether there is an old profile whose messages should be restored.
     * @returns A remote BackendHandle that can be used by the backend controller to access the
     *   backend worker.
     */
    public static async createFromDeviceJoin(
        backendInit: BackendInit,
        factories: FactoriesForBackend,
        {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
        deviceLinkingSetup: ProxyEndpoint<DeviceLinkingSetup>,
        pinForwarder: ProxyEndpoint<PinForwarder>,
        oldProfileRemover: ProxyEndpoint<OldProfileRemover>,
        shouldRestoreOldMessages: boolean,
    ): Promise<ProxyEndpoint<BackendHandle>> {
        const log = logging.logger('backend.create.from-join');
        log.info('Creating backend through device linking flow');

        // Initialize services that are needed early
        const phase1Services = initEarlyBackendServicesWithoutConfig(
            factories,
            {endpoint, logging},
            backendInit,
        );

        // Get access to linking setup information
        const wrappedDeviceLinkingSetup = endpoint.wrap<DeviceLinkingSetup>(
            deviceLinkingSetup,
            logging.logger('com.device-linking'),
        );

        const {linkingState} = wrappedDeviceLinkingSetup;

        const wrappedPinForwarder = endpoint.wrap<PinForwarder>(
            pinForwarder,
            logging.logger('com.pin-forwarding'),
        );

        const wrappedOldProfileRemover = endpoint.wrap<OldProfileRemover>(
            oldProfileRemover,
            logging.logger('com.profile-removal'),
        );

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

        let config: Config;
        let oppfConfig: OppfFetchConfig | undefined;
        let oppfFile: {readonly parsed: oppf.OppfFile; readonly string: string} | undefined;
        let workCredentials: ThreemaWorkCredentials | undefined;

        // Handle OnPrem (if necessary)
        if (import.meta.env.BUILD_ENVIRONMENT === 'onprem') {
            // Request OPPF config from the user
            await linkingState.updateState({state: 'oppf'});
            oppfConfig = await wrappedDeviceLinkingSetup.oppfConfig;

            // Fetch and verify OPPF
            try {
                oppfFile = await this._fetchAndVerifyOppfFile(phase1Services, oppfConfig);
                workCredentials = {
                    username: oppfConfig.username,
                    password: oppfConfig.password,
                };
            } catch (error) {
                log.error('Unable to fetch/decode/verify OPPF file', error);
                return await throwLinkingError(
                    'Fetching or verifying the OPPF file failed',
                    {kind: 'onprem-configuration-error'},
                    ensureError(error),
                );
            }

            await wrappedPinForwarder.forward(oppfFile.parsed.publicKeyPinning);
            config = createConfigFromOppf(oppfFile.parsed);
        } else {
            config = createDefaultConfig();
        }

        // Set `workData` if `workCredentials` are already present (i.e., if this is an OnPrem build).
        // Note: In regular work builds the value will be set later.
        const workData: IWritableStore<ThreemaWorkData | undefined> | undefined =
            import.meta.env.BUILD_VARIANT !== 'work'
                ? undefined
                : new WritableStore(workCredentials === undefined ? undefined : {workCredentials});

        // Initialise more services
        const phase2Services = {
            ...initEarlyBackendServicesWithConfig(factories, {...phase1Services, config}, workData),
            config,
        };

        // Generate rendezvous setup with all information needed to show the QR code
        let setup: RendezvousProtocolSetup;
        {
            const rendezvousPath = bytesToHex(
                phase1Services.crypto.randomBytes(new Uint8Array(32)),
            );
            setup = {
                role: 'initiator',
                ak: randomRendezvousAuthenticationKey(phase1Services.crypto),
                relayedWebSocket: {
                    pathId: 1,
                    url: new URL(rendezvousPath, config.rendezvousServerUrl(rendezvousPath)),
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
        const userPasswordPromise = new ResolvablePromise<string>({uncaught: 'default'});
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
                .catch((error: unknown) =>
                    log.error(`Waiting for userPassword promise failed: ${error}`),
                );
        };
        const joinProtocol = new DeviceJoinProtocol(
            connectResult.connection,
            onBegin,
            logging.logger('backend-controller.join'),
            {crypto: phase1Services.crypto, file: phase2Services.file},
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

            // Abort rendezvous connection
            rendezvous.abort('protocol-error');

            return await throwLinkingError(
                `Device join protocol failed: ${error}`,
                {kind: 'join-error'},
                ensureError(error),
            );
        }

        await updateSyncingPhase('loading');

        // Generate new random database key
        const databaseKey = wrapRawDatabaseKey(
            phase1Services.crypto.randomBytes(new Uint8Array(DATABASE_KEY_LENGTH)),
        );
        const databaseKeyForKeyStorage = wrapRawDatabaseKey(databaseKey.unwrap().slice());

        // Create database
        const db = factories.db(
            {config},
            logging.logger('db'),
            {userIdentity: joinResult.identity},
            databaseKey,
            false,
        );

        // Create nonces service and import nonces from joinResult
        const nonces = new NonceService(
            {crypto: phase1Services.crypto, db, logging},
            new Identity(joinResult.identity),
        );
        log.info(`Importing ${joinResult.cspHashedNonces.size} CSP nonces.`);
        nonces.importNonces(NonceScope.CSP, joinResult.cspHashedNonces);
        log.info(`Importing ${joinResult.d2dHashedNonces.size} D2D nonces.`);
        nonces.importNonces(NonceScope.D2D, joinResult.d2dHashedNonces);

        // Wrap the client key (but keep a copy for the key storage)
        const rawCkForKeyStorage = wrapRawClientKey(joinResult.rawCk.unwrap().slice());
        const ck = SecureSharedBoxFactory.consume(
            phase1Services.crypto,
            nonces,
            NonceScope.CSP,
            joinResult.rawCk,
        ) as ClientKey;

        // Look up identity information and server group on directory server
        let privateData;
        try {
            privateData = await phase2Services.directory.privateData(joinResult.identity, ck);
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
        let phase3Services: {
            readonly work: WorkBackend;
        };
        switch (import.meta.env.BUILD_VARIANT) {
            case 'consumer':
                if (joinResult.workCredentials !== undefined) {
                    return await throwLinkingError(
                        `This is a consumer app, but essential data contains Threema Work credentials for ${joinResult.workCredentials.username}.`,
                        {kind: 'generic-error'},
                    );
                }
                phase3Services = {work: new StubWorkBackend()};
                break;
            case 'work': {
                const productName =
                    import.meta.env.BUILD_FLAVOR === 'work-onprem'
                        ? 'Threema Work (OnPrem)'
                        : 'Threema Work';

                if (joinResult.workCredentials === undefined) {
                    return await throwLinkingError(
                        `This is a ${productName} app, but essential data did not include ${productName} credentials. Ensure that you're using the latest mobile app version.`,
                        {kind: 'generic-error'},
                    );
                }
                if (joinResult.workCredentials.username === '') {
                    return await throwLinkingError(
                        `${productName} credentials username is empty.`,
                        {
                            kind: 'invalid-work-credentials',
                        },
                    );
                }
                if (joinResult.workCredentials.password === '') {
                    return await throwLinkingError(
                        `${productName} credentials password is empty.`,
                        {
                            kind: 'invalid-work-credentials',
                        },
                    );
                }

                // In `"work"` builds `workData` must be a store.
                const unwrappedWorkData = unwrap(workData);
                // Set `workCredentials` obtained during device join.
                unwrappedWorkData.set({workCredentials: joinResult.workCredentials});

                phase3Services = {
                    work: new FetchWorkBackend({
                        config,
                        logging,
                        systemInfo: backendInit.systemInfo,
                    }),
                };
                let licenseStatus;
                try {
                    licenseStatus = await phase3Services.work.checkLicense(
                        // Unwrap is fine here because we check above for undefined
                        unwrap(unwrappedWorkData.get()).workCredentials,
                    );
                } catch (error) {
                    return await throwLinkingError(
                        `${productName} credentials could not be validated: ${error}`,
                        {kind: 'generic-error'},
                    );
                }
                if (licenseStatus.valid) {
                    log.info(`${productName} credentials are valid`);
                } else {
                    return await throwLinkingError(
                        `${productName} credentials are invalid or revoked: ${licenseStatus.message}`,
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
        const services = initBackendServices(
            {...phase1Services, ...phase2Services, ...phase3Services},
            db,
            identityData,
            deviceIds,
            joinResult.cspDeviceCookie,
            dgk,
            nonces,
            import.meta.env.BUILD_VARIANT === 'work'
                ? ensureStoreValue(unwrap(workData))
                : undefined,
        );
        const backend = new Backend(services);

        // Initialize database with essential data
        try {
            await joinProtocol.restoreEssentialData(services.model, identityData.identity);
        } catch (error) {
            return await throwLinkingError(
                `Failed to restore essential data: ${error}`,
                {kind: 'restore-error'},
                ensureError(error),
            );
        }

        // Wait for user password (or connection aborting)
        log.debug('Waiting for user password');
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

        let onPremConfig: KeyStorageOppfConfig | undefined;

        if (import.meta.env.BUILD_ENVIRONMENT === 'onprem') {
            onPremConfig = {
                oppfUrl: unwrap(oppfConfig).oppfUrl,
                oppfCachedConfig: unwrap(oppfFile).string,
                lastUpdated: BigInt(new Date().getUTCMilliseconds()),
            };
        }

        // Only continue this process if an old profile was found
        if (shouldRestoreOldMessages) {
            let oldDatabaseKey: RawDatabaseKey | undefined | 'no-restoration' = undefined;
            try {
                const {dbKey, oldUserIdentity} = await unlockDatabaseKey(
                    services,
                    userPassword,
                    log,
                    factories,
                );
                if (oldUserIdentity !== identityData.identity) {
                    log.debug(
                        'Tried to restore the messages of a profile whose identity does not match the new profile.',
                    );
                    await wrappedDeviceLinkingSetup.linkingState.updateState({
                        state: 'restoration-identity-mismatch',
                    });
                    await wrappedDeviceLinkingSetup.continueWithoutRestoring;
                    oldDatabaseKey = 'no-restoration';
                } else {
                    oldDatabaseKey = dbKey;
                }
            } catch (errorInfo) {
                if (errorInfo instanceof KeyStorageError) {
                    log.debug(
                        'New password did not match the password of the old profile, continuing with password restoration dialog',
                    );
                } else {
                    return await throwLinkingError(
                        `Dealing with the restoration of an old identity failed: ${errorInfo}`,
                        {
                            kind: 'generic-error',
                        },
                    );
                }
            }

            let previouslyEnteredPassword: string | undefined = undefined;
            while (oldDatabaseKey === undefined) {
                await wrappedDeviceLinkingSetup.linkingState.updateState({
                    state: 'waiting-for-old-profile-password',
                    previouslyEnteredPassword,
                    type: 'default',
                });

                const oldProfilePassword =
                    await wrappedDeviceLinkingSetup.oldProfilePassword.value();
                if (oldProfilePassword === undefined) {
                    await wrappedDeviceLinkingSetup.linkingState.updateState({
                        state: 'waiting-for-old-profile-password',
                        type: 'skipped',
                    });
                    break;
                }

                await wrappedDeviceLinkingSetup.linkingState.updateState({
                    state: 'waiting-for-old-profile-password',
                    previouslyEnteredPassword,
                    type: 'restoring',
                });
                previouslyEnteredPassword = oldProfilePassword;

                let oldProfileInformation;
                try {
                    oldProfileInformation = await unlockDatabaseKey(
                        services,
                        oldProfilePassword,
                        log,
                        factories,
                    );
                    if (oldProfileInformation.oldUserIdentity !== identityData.identity) {
                        log.debug(
                            'Tried to restore the messages of a profile whose identity does not match the new profile',
                        );

                        await wrappedDeviceLinkingSetup.linkingState.updateState({
                            state: 'restoration-identity-mismatch',
                        });
                        await wrappedDeviceLinkingSetup.continueWithoutRestoring;
                        oldDatabaseKey = 'no-restoration';
                        break;
                    }
                    oldDatabaseKey = oldProfileInformation.dbKey;
                } catch (errorInfo) {
                    if (errorInfo instanceof KeyStorageError) {
                        log.debug(
                            'New password did not match the password of the old profile, continuing with password restoration dialog',
                        );
                        continue;
                    } else {
                        return await throwLinkingError(
                            `Dealing with the restoration of an old identity failed: ${errorInfo}`,
                            {
                                kind: 'generic-error',
                            },
                        );
                    }
                }
            }

            if (oldDatabaseKey !== undefined && oldDatabaseKey !== 'no-restoration') {
                await updateSyncingPhase('restoring');
                try {
                    await transferOldMessages(
                        services,
                        oldDatabaseKey,
                        db,
                        config,
                        log,
                        factories,
                        1000,
                    );
                } catch (errorInfo) {
                    return await throwLinkingError(
                        `Restoring the old messages failed: ${errorInfo} `,
                        {
                            kind: 'old-messages-restoration-error',
                        },
                    );
                }
            } else {
                log.info('Not restoring messages, continuing normal flow');
            }
        }

        // Now that essential data is processed, we can connect to the Mediator server and register
        // ourselves
        let initialConnectionResult;
        try {
            initialConnectionResult = await backend._connectionManager.start();
        } catch (error) {
            return await throwLinkingError(
                'Device join protocol was aborted while starting connection',
                {kind: 'connection-error', cause: 'closed'},
            );
        }

        if (initialConnectionResult.connected) {
            await updateSyncingPhase('encrypting');
            // Write key storage
            await writeKeyStorage(
                phase1Services,
                userPassword,
                identityData,
                deviceIds,
                joinResult.cspDeviceCookie,
                rawCkForKeyStorage,
                dgkForKeyStorage,
                databaseKeyForKeyStorage,
                joinResult.workCredentials,
                onPremConfig,
            );
            purgeSensitiveData();

            // Mark join protocol as complete and update state
            try {
                await joinProtocol.complete();
                await linkingState.updateState({state: 'registered'});
            } catch (error) {
                return await throwLinkingError(
                    'Device join protocol was aborted while completing the join protocol',
                    {kind: 'connection-error', cause: 'closed'},
                );
            }

            // Delete old versions of this profile from the file system (if any).
            await wrappedOldProfileRemover.remove();
        } else {
            // Purge data and report error
            purgeSensitiveData();
            let errorInfo = `Close code ${initialConnectionResult.info.code}`;
            const closeCodeName = CloseCodeUtils.nameOf(initialConnectionResult.info.code);
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
        endpoint.exposeProxy(backend.handle, local, logging.logger('com.backend'));
        return endpoint.transfer(remote, [remote]);
    }

    private static async _fetchAndVerifyOppfFile(
        earlyServices: EarlyBackendServicesThatDontRequireConfig,
        {oppfUrl, username, password}: OppfFetchConfig,
    ): Promise<{readonly parsed: oppf.OppfFile; readonly string: string}> {
        let response: Response;
        try {
            response = await fetch(oppfUrl, {
                method: 'GET',
                headers: {
                    'authorization': `Basic ${u8aToBase64(UTF8.encode(`${username}:${password}`))}}`,
                    'accept': 'application/json',
                    'user-agent': STATIC_CONFIG.USER_AGENT,
                },
            });
        } catch (error) {
            throw new Error('Failed to fetch the config file');
        }
        const binary = await response.arrayBuffer();
        return oppf.verifyOppfFile(
            earlyServices,
            STATIC_CONFIG.ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS,
            new Uint8Array(binary),
        );
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
     * Schedule backend background jobs.
     */
    private _scheduleBackgroundJobs(): void {
        this._log.info('Scheduling background jobs');

        // Schedule license check every 12h
        if (import.meta.env.BUILD_VARIANT === 'work') {
            this._backgroundJobScheduler.scheduleRecurringJob(
                (log) => workLicenseCheckJob(this._services, log),
                {
                    tag: 'work-license-check',
                    intervalS: 12 * 3600,
                    initialTimeoutS: 1,
                },
            );
        }
    }
}
