import type {
    EarlyServicesThatDontRequireConfig,
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
import type {NonReadonlyPublicKey, SignedDataEd25519} from '~/common/crypto';
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
import {DeviceBackend, type DeviceIds, type IdentityData} from '~/common/device';
import {workLicenseCheckJob} from '~/common/dom/backend/background-jobs';
import {DeviceJoinProtocol, type DeviceJoinResult} from '~/common/dom/backend/join';
import * as oppf from '~/common/dom/backend/onprem/oppf';
import {OPPF_VALIDATION_SCHEMA} from '~/common/dom/backend/onprem/oppf';
import {randomBytes} from '~/common/dom/crypto/random';
import {DebugBackend} from '~/common/dom/debug';
import {ConnectionManager} from '~/common/dom/network/protocol/connection';
import {FetchBlobBackend} from '~/common/dom/network/protocol/fetch-blob';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {
    RendezvousConnection,
    type RendezvousProtocolSetup,
} from '~/common/dom/network/protocol/rendezvous';
import {workLicenseCheck} from '~/common/dom/network/protocol/work-license-check';
import type {SafeCredentials} from '~/common/dom/safe';
import type {SystemInfo} from '~/common/electron-ipc';
import {CloseCodeUtils, NonceScope, TransferTag} from '~/common/enum';
import {
    BaseError,
    type BaseErrorOptions,
    DeviceJoinError,
    extractErrorTraceback,
    type RendezvousCloseCause,
    RendezvousCloseError,
    extractErrorMessage,
} from '~/common/error';
import type {FileStorage, ServicesForFileStorageFactory} from '~/common/file-storage';
import {
    type KeyStorage,
    type KeyStorageContents,
    KeyStorageError,
    type ServicesForKeyStorageFactory,
    type KeyStorageOppfConfig,
} from '~/common/key-storage';
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
import {DropDeviceTask} from '~/common/network/protocol/task/d2m/drop-device';
import {TaskManager} from '~/common/network/protocol/task/manager';
import {
    type ClientKey,
    randomRendezvousAuthenticationKey,
    type RawClientKey,
    type RawDeviceGroupKey,
    wrapRawClientKey,
    wrapRawDeviceGroupKey,
} from '~/common/network/types/keys';
import type {ThreemaWorkCredentials} from '~/common/node/key-storage/key-storage-file';
import {type NotificationCreator, NotificationService} from '~/common/notification';
import type {SystemDialogService} from '~/common/system-dialog';
import type {DomainCertificatePin, ReadonlyUint8Array} from '~/common/types';
import {
    assertError,
    assertUnreachable,
    ensureError,
    unreachable,
    unwrap,
} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';
import {bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
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
import {type LocalStore, type StoreDeactivator, WritableStore} from '~/common/utils/store';
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
    | 'key-storage-error-wrong-password'
    | 'onprem-configuration-error';

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
    readonly frontendMediaServiceEndpoint: EndpointFor<IFrontendMediaService>;
    readonly notificationEndpoint: EndpointFor<NotificationCreator>;
    readonly systemDialogEndpoint: EndpointFor<SystemDialogService>;
    readonly systemInfo: SystemInfo;
}

/**
 * Data required to be supplied to a backend worker for initialisation.
 */
export interface BackendInitAfterTransfer {
    readonly frontendMediaServiceEndpoint: TransferredFromRemote<
        EndpointFor<IFrontendMediaService>
    >;
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
        pinForwarder: TransferredFromRemote<EndpointFor<PinForwarder>>,
    ) => Promise<TransferredToRemote<EndpointFor<BackendHandle>>>;

    /** Instantiate backend through the device join protocol. */
    readonly fromDeviceJoin: (
        init: Remote<BackendInitAfterTransfer>,
        deviceLinkingSetup: TransferredFromRemote<EndpointFor<DeviceLinkingSetup>>,
        pinForwarder: TransferredFromRemote<EndpointFor<PinForwarder>>,
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
    | 'config'
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
 *   with the consumer build variant, or vice versa.
 * - invalid-identity: Restoring failed because user identity is unknown or revoked.
 * - invalid-work-credentials: Restoring failed because user's Threema Work credentials are invalid or expired.
 * - registration-error: Initial registration at Mediator server failed.
 * - generic-error: Some other error during linking.
 * - onprem-configuration-error: An error when parsing or verifying the onprem configuration file.
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
    | {readonly kind: 'onprem-configuration-error'};

export type SyncingPhase = 'receiving' | 'restoring' | 'encrypting';

/**
 * Matches the interface in `ui/linking/index.ts`
 */
export interface OppfFetchConfig {
    readonly password: string;
    readonly username: string;
    readonly oppfUrl: string;
}

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

    /**
     * A promise that will be fulfilled by the frontend when the user has entered a oppf url
     */
    readonly oppfConfig: Promise<OppfFetchConfig>;
}

export interface PinForwarder extends ProxyMarked {
    readonly forward: (pins: DomainCertificatePin[] | undefined) => void;
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
 * Create an instance of the {@link BackendMediaService} by wrapping an endpoint for the
 * {@link IFrontendMediaService}.
 */
function createMediaService(
    endpoint: EndpointService,
    frontendMediaService: EndpointFor<IFrontendMediaService>,
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

function initBackendServicesWithoutConfig(
    factories: FactoriesForBackend,
    {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
    backendInit: BackendInit,
): EarlyServicesThatDontRequireConfig {
    const crypto = new TweetNaClBackend(randomBytes);
    const {frontendMediaServiceEndpoint, notificationEndpoint} = backendInit;
    const compressor = factories.compressor();
    const notification = createNotificationService(endpoint, notificationEndpoint, logging);
    const media = createMediaService(endpoint, frontendMediaServiceEndpoint, logging);
    const systemDialog: Remote<SystemDialogService> = endpoint.wrap(
        backendInit.systemDialogEndpoint,
        logging.logger('com.system-dialog'),
    );
    const taskManager = new TaskManager({logging});
    const keyStorage = factories.keyStorage({crypto}, logging.logger('key-storage'));

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
    };
}

/**
 * Initialize the backend services that don't require an active identity for being intialized.
 */
function initBackendServicesWithoutIdentityWithConfig(
    factories: FactoriesForBackend,
    {config, crypto, logging}: Pick<ServicesForBackend, 'crypto' | 'config' | 'logging'>,
    workCredentials: ThreemaWorkCredentials | undefined,
): Pick<ServicesForBackend, 'directory' | 'file'> {
    const file = factories.fileStorage({config, crypto}, logging.logger('storage'));
    const directory = new FetchDirectoryBackend({config, logging}, workCredentials);

    return {
        directory,
        file,
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
        media,
        notification,
        taskManager,
        systemDialog,
    } = simpleServices;

    const workData = workCredentials === undefined ? undefined : {workCredentials};

    const device = new DeviceBackend(
        {crypto, db, logging, nonces},
        identityData,
        deviceIds,
        dgk,
        workData,
    );
    const blob = new FetchBlobBackend({config, device, directory});
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
        media,
        nonces,
        notification,
        taskManager,
        systemDialog,
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
            dgk,
            databaseKey,
            deviceIds: {...deviceIds},
            workCredentials: workCredentials === undefined ? undefined : {...workCredentials},
            onPremConfig:
                onPremConfig === undefined
                    ? undefined
                    : {
                          ...onPremConfig,
                      },
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
    public readonly config: Config;

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
        this.config = _services.config;

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
        pinForwarder: EndpointFor<PinForwarder>,
    ): Promise<TransferredToRemote<EndpointFor<BackendHandle>>> {
        const log = logging.logger('backend.create.from-keystorage');
        log.info('Creating backend from existing key storage');

        // Initialize services that are needed early
        const earlyServices = initBackendServicesWithoutConfig(
            factories,
            {endpoint, logging},
            backendInit,
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
            keyStorageContents = await earlyServices.keyStorage.read(keyStoragePassword);
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

        // In OnPrem builds, the config needs to be initialized based on the OPPF (On-Prem Provisioning File).
        // In other builds, the config is static.
        let config: Config;
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
                let parsedOppfResponse: oppf.Type;
                const responseObject = await this._fetchAndVerifyOppfFile(earlyServices, {
                    password: workCredentials.password,
                    username: workCredentials.username,
                    oppfUrl: keyStorageContents.onPremConfig.oppfUrl,
                });
                if (responseObject.parsedOppfResponse !== undefined) {
                    // Valid OPPF found! Use it, and cache it in the key storage.
                    parsedOppfResponse = responseObject.parsedOppfResponse;
                    const newOnPremConfig: KeyStorageOppfConfig = {
                        oppfUrl: keyStorageContents.onPremConfig.oppfUrl,
                        lastUpdated: BigInt(new Date().getUTCMilliseconds()),
                        oppfCachedConfig: responseObject.rawResponse,
                    };
                    earlyServices.keyStorage
                        .changeCachedOnPremConfig(keyStoragePassword, newOnPremConfig)
                        .catch((error) =>
                            log.error(
                                `Failed to cache OnPrem config: ${extractErrorMessage(ensureError(error), 'short')}`,
                            ),
                        );
                } else {
                    // OPPF could not be fetched or is not valid. Use cached version instead.
                    parsedOppfResponse = OPPF_VALIDATION_SCHEMA.parse(
                        JSON.parse(keyStorageContents.onPremConfig.oppfCachedConfig),
                    );
                }
                await wrappedPinForwarder.forward(parsedOppfResponse.publicKeyPinning);
                config = createConfigFromOppf(parsedOppfResponse);
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

        const lateInitServices = initBackendServicesWithoutIdentityWithConfig(
            factories,
            {
                ...earlyServices,
                config,
            },
            keyStorageContents.workCredentials,
        );

        //
        const services = {
            ...lateInitServices,
            ...earlyServices,
            config,
        };

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
            // backendServices.systemDialog.open({type: 'missing-work-credentials'}).catch(assertUnreachable);;
            // startConnection = false;
        }

        // Start connection
        backend.connectionManager.start().catch(() => {
            // This fires when the first connection exits with an error. We can totally ignore it.
        });

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
     * @param backendInit {BackendInit} Data required to be supplied to a backend worker for
     *   initialization.
     * @param factories {FactoriesForBackend} The factories needed in the backend.
     * @param services The services needed in the backend.
     * @param deviceLinkingSetup Information needed for the device linking flow.
     * @returns A remote BackendHandle that can be used by the backend controller to access the
     *   backend worker.
     */
    public static async createFromDeviceJoin(
        backendInit: BackendInit,
        factories: FactoriesForBackend,
        {endpoint, logging}: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
        deviceLinkingSetup: EndpointFor<DeviceLinkingSetup>,
        pinForwarder: EndpointFor<PinForwarder>,
    ): Promise<TransferredToRemote<EndpointFor<BackendHandle>>> {
        const log = logging.logger('backend.create.from-join');
        log.info('Creating backend through device linking flow');

        // Initialize services that are needed early
        const earlyServices = initBackendServicesWithoutConfig(
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
        let rawResponse: string | undefined;
        let workCredentials: ThreemaWorkCredentials | undefined;
        // Handle on prem dialog if necesary
        if (import.meta.env.BUILD_ENVIRONMENT === 'onprem') {
            try {
                oppfConfig = await wrappedDeviceLinkingSetup.oppfConfig;
                const responseObject = await this._fetchAndVerifyOppfFile(
                    earlyServices,
                    oppfConfig,
                );
                workCredentials = {
                    username: oppfConfig.username,
                    password: oppfConfig.password,
                };
                const parsedOppfResponse = responseObject.parsedOppfResponse;
                if (parsedOppfResponse === undefined) {
                    log.warn('Verifying the signed OPPF failed');
                    return await throwLinkingError('Verifying the OPPF file failed', {
                        kind: 'onprem-configuration-error',
                    });
                }
                rawResponse = responseObject.rawResponse;
                await wrappedPinForwarder.forward(parsedOppfResponse.publicKeyPinning);
                config = createConfigFromOppf(parsedOppfResponse);
            } catch (error) {
                log.error('Failed to fetch OPPF file with reason:', error);
                return await throwLinkingError(
                    'Fetching the OPPF file failed',
                    {kind: 'onprem-configuration-error'},
                    ensureError(error),
                );
            }
        } else {
            config = createDefaultConfig();
        }

        const services = {
            ...earlyServices,
            ...initBackendServicesWithoutIdentityWithConfig(
                factories,
                {...earlyServices, config},
                workCredentials,
            ),
            config,
        };

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

                let licenseCheckResult;
                try {
                    licenseCheckResult = await workLicenseCheck(
                        services.config.DIRECTORY_SERVER_URL,
                        joinResult.workCredentials,
                        backendInit.systemInfo,
                        log,
                    );
                } catch (error) {
                    return await throwLinkingError(
                        `${productName} credentials could not be validated: ${error}`,
                        {kind: 'generic-error'},
                    );
                }
                if (licenseCheckResult.valid) {
                    log.info(`${productName} credentials are valid`);
                } else {
                    return await throwLinkingError(
                        `${productName} credentials are invalid or revoked: ${licenseCheckResult.message}`,
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

        let onPremConfig: KeyStorageOppfConfig | undefined;

        if (
            import.meta.env.BUILD_ENVIRONMENT === 'onprem' &&
            oppfConfig !== undefined &&
            rawResponse !== undefined
        ) {
            onPremConfig = {
                oppfUrl: oppfConfig.oppfUrl,
                oppfCachedConfig: rawResponse,
                lastUpdated: BigInt(new Date().getUTCMilliseconds()),
            };
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
                onPremConfig,
            );
            purgeSensitiveData();

            // Mark join protocol as complete and update state
            await joinProtocol.complete();
            await linkingState.updateState({state: 'registered'});
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
        endpoint.exposeProxy(backend, local, logging.logger('com.backend'));
        const transferredRemote: TransferredToRemote<EndpointFor<BackendHandle>> =
            endpoint.transfer(remote, [remote]);
        return transferredRemote;
    }

    private static async _fetchAndVerifyOppfFile(
        earlyServices: EarlyServicesThatDontRequireConfig,
        oppfConfig: OppfFetchConfig,
    ): Promise<
        {parsedOppfResponse: oppf.Type; rawResponse: string} | {parsedOppfResponse: undefined}
    > {
        let response: Response;
        try {
            response = await fetch(oppfConfig.oppfUrl, {
                method: 'GET',
                headers: new Headers({
                    'authorization': `Basic ${u8aToBase64(UTF8.encode(`${oppfConfig.username}:${oppfConfig.password}`))}}`,
                    'accept': 'application/json',
                    'user-agent': STATIC_CONFIG.USER_AGENT,
                }),
            });
        } catch (error) {
            throw new Error('Failed to fetch the config file');
        }
        const binary = await response.arrayBuffer();
        const signedBuffer = new Uint8Array(binary);
        const rawResponse = oppf.trimSignature(signedBuffer);
        const parsedOppfResponse = OPPF_VALIDATION_SCHEMA.parse(JSON.parse(rawResponse));

        // At the moment, we return the verified file instead of just checking it which `tweetnacl` also supports.
        // This leads to simplified parsing and typing.
        // Should the need arise to change this, we can always switch to verification only.
        if (
            earlyServices.crypto.verifyEd25519Signature(
                signedBuffer as SignedDataEd25519,
                parsedOppfResponse.signatureKey as NonReadonlyPublicKey,
            ) !== undefined
        ) {
            return {parsedOppfResponse, rawResponse};
        }

        return {parsedOppfResponse: undefined};
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
                this._backgroundJobScheduler.scheduleRecurringJob(
                    (log) => workLicenseCheckJob(workData, this._services, log),
                    {
                        tag: 'work-license-check',
                        intervalS: 12 * 3600,
                        initialTimeoutS: 1,
                    },
                );
            }
        }
    }
}
