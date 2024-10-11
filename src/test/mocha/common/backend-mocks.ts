/**
 * Mocked services and other aspects of the backend.
 */
import {randomBytes as nodeRandomBytes} from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import type {Config} from '~/common/config';
import {
    type CryptoBackend,
    type EncryptedData,
    ensureNonce,
    ensurePublicKey,
    NACL_CONSTANTS,
    type Nonce,
    type NonceHash,
    type RawKey,
    wrapRawKey,
} from '~/common/crypto';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import {deriveDeviceGroupKeys} from '~/common/crypto/device-group-keys';
import type {INonceGuard, INonceService} from '~/common/crypto/nonce';
import {randomU64} from '~/common/crypto/random';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {type DatabaseBackend, type DbReceiverLookup, wrapRawDatabaseKey} from '~/common/db';
import type {Device} from '~/common/device';
import type {SystemInfo} from '~/common/electron-ipc';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    IdentityType,
    MessageFilterInstruction,
    MessageFilterInstructionUtils,
    NonceScope,
    SyncState,
    type TransactionScope,
    TransactionScopeUtils,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {ConnectionClosed} from '~/common/error';
import {InMemoryFileStorage} from '~/common/file-storage';
import {TRANSFER_HANDLER} from '~/common/index';
import {LoadingInfo} from '~/common/loading';
import {type Logger, type LoggerFactory, NOOP_LOGGER, TagLogger} from '~/common/logging';
import {BackendMediaService, type IFrontendMediaService} from '~/common/media';
import type {
    Contact,
    ContactInit,
    Group,
    ProfilePictureView,
    Repositories,
    ServicesForModel,
} from '~/common/model';
import {ContactModelRepository} from '~/common/model/contact';
import {ConversationModelRepository} from '~/common/model/conversation';
import {GlobalPropertyRepository} from '~/common/model/global-property';
import {GroupModelRepository} from '~/common/model/group';
import {MessageModelRepository} from '~/common/model/message';
import {
    ProfilePictureModelRepository,
    type ProfilePictureRepository,
} from '~/common/model/profile-picture';
import {AppearanceSettingsModelStore} from '~/common/model/settings/appearance';
import {CallsSettingsModelStore} from '~/common/model/settings/calls';
import {ChatSettingsModelStore} from '~/common/model/settings/chat';
import {DevicesSettingsModelStore} from '~/common/model/settings/devices';
import {MediaSettingsModelStore} from '~/common/model/settings/media';
import {PrivacySettingsModelStore} from '~/common/model/settings/privacy';
import {ProfileSettingsModelStore} from '~/common/model/settings/profile';
import type {ContactRepository} from '~/common/model/types/contact';
import type {ConversationRepository} from '~/common/model/types/conversation';
import type {GroupRepository} from '~/common/model/types/group';
import type {MessageRepository} from '~/common/model/types/message';
import type {
    DevicesSettings,
    IGlobalPropertyRepository,
    PrivacySettings,
    ProfileSettings,
    AppearanceSettings,
    CallsSettings,
    MediaSettings,
    ChatSettings,
} from '~/common/model/types/settings';
import type {User} from '~/common/model/types/user';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import type {JoinResponse} from '~/common/network/protobuf/validate/group-call';
import {
    CspPayloadType,
    D2mPayloadType,
    type InboundL4Message,
    type OutboundL4D2mTransactionMessage,
    type OutboundL4Message,
} from '~/common/network/protocol';
import {
    type BlobBackend,
    type BlobDownloadResult,
    type BlobId,
    type BlobScope,
    ensureBlobId,
} from '~/common/network/protocol/blob';
import {CallManager} from '~/common/network/protocol/call';
import {GroupCallError, type GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import {
    type DirectoryBackend,
    DirectoryError,
    type IdentityData,
    type IdentityPrivateData,
    type SfuToken,
} from '~/common/network/protocol/directory';
import type {D2mMessageFlags} from '~/common/network/protocol/flags';
import {PersistentProtocolStateBackend} from '~/common/network/protocol/persistent-protocol-state';
import type {PeekResponse, SfuHttpBackend} from '~/common/network/protocol/sfu';
import type {
    ActiveTaskCodecHandle,
    ServicesForTasks,
    TaskCodecReadInstruction,
    TaskController,
    TransactionResult,
    TransactionRunning,
} from '~/common/network/protocol/task';
import {_only_for_testing, TaskManager} from '~/common/network/protocol/task/manager';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import {VolatileProtocolStateBackend} from '~/common/network/protocol/volatile-protocol-state';
import type {WorkBackend, WorkContacts, WorkLicenseStatus} from '~/common/network/protocol/work';
import * as structbuf from '~/common/network/structbuf';
import {
    ensureBaseUrl,
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureFeatureMask,
    ensureIdentityString,
    ensureServerGroup,
    FEATURE_MASK_FLAG,
    type DeviceCookie,
    type FeatureMask,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type ClientKey, wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {ZlibCompressor} from '~/common/node/compressor';
import {randomBytes} from '~/common/node/crypto/random';
import {SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {FileSystemKeyStorage} from '~/common/node/key-storage';
import {
    type NotificationCreator,
    type NotificationHandle,
    NotificationService,
    type CustomNotification,
} from '~/common/notification';
import type {SystemDialog, SystemDialogHandle, SystemDialogService} from '~/common/system-dialog';
import type {u8, u53, ReadonlyUint8Array} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import type {Delayed} from '~/common/utils/delayed';
import {
    type EndpointService,
    LocalObjectMapper,
    type PROXY_HANDLER,
    type Remote,
    RemoteObjectMapper,
    type RemoteProxy,
} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {Identity} from '~/common/utils/identity';
import {ValueObject} from '~/common/utils/object';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser} from '~/common/utils/signal';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {ViewModelRepository} from '~/common/viewmodel';
import {ViewModelCache} from '~/common/viewmodel/cache';
import type {DtlsFingerprint, WebRtcService} from '~/common/webrtc';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';

export const MOCK_URL = ensureBaseUrl('https://127.0.0.1:9999/', 'https:');
const TEST_CONFIG: Config = {
    CHAT_SERVER_KEY: ensurePublicKey(nodeRandomBytes(32)),
    mediatorServerUrl: () => MOCK_URL,
    MEDIATOR_FRAME_MIN_BYTE_LENGTH: 4,
    MEDIATOR_FRAME_MAX_BYTE_LENGTH: 65536,
    MEDIATOR_RECONNECTION_DELAY_S: 1,
    DIRECTORY_SERVER_URL: MOCK_URL,
    BLOB_SERVER_URLS: {
        upload: () => MOCK_URL,
        download: () => MOCK_URL,
        done: () => MOCK_URL,
    },
    safeServerUrl: () => MOCK_URL,
    rendezvousServerUrl: () => MOCK_URL,
    UPDATE_SERVER_URL: MOCK_URL,
    WORK_SERVER_URL: MOCK_URL,
    DEBUG_PACKET_CAPTURE_HISTORY_LENGTH: 100,
    KEY_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    FILE_STORAGE_PATH: ['/tmp/desktop-mocha-tests'],
    DATABASE_PATH: ':memory:',
    USER_AGENT: 'Threema Desktop Mocha Tests',
    ONPREM_CONFIG_TRUSTED_PUBLIC_KEYS: [],
};

const FAKE_PROXY_HANDLER = undefined as unknown as typeof PROXY_HANDLER;

export class TestTweetNaClBackend extends TweetNaClBackend {
    public constructor() {
        super(randomBytes);
    }
}

export function initSqliteBackend(logger: Logger): SqliteDatabaseBackend {
    // Instantiate SQLite backend, backed by in-memory table
    const dbKey = wrapRawDatabaseKey(new Uint8Array(32));
    const backend = SqliteDatabaseBackend.create(
        logger,
        {userIdentity: ensureIdentityString('MEMEMEME')},
        ':memory:',
        dbKey,
    );

    // Run migrations
    backend.runMigrations();

    return backend;
}

/**
 * A test directory backend that allows registering data that should be returned by the mocked
 * directory.
 */
class TestDirectoryBackend implements DirectoryBackend {
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    private readonly _knownUsers: Record<IdentityString, IdentityData | undefined> = {};
    private _privateData: IdentityPrivateData | undefined = undefined;

    public registerUser(identity: IdentityString, data: IdentityData): void {
        this._knownUsers[identity] = data;
    }

    public setPrivateData(privateData: IdentityPrivateData): void {
        this._privateData = privateData;
    }

    public async authToken(): Promise<string> {
        return await Promise.resolve('mock token');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async sfuToken(identity: IdentityString, ck: ClientKey): Promise<SfuToken> {
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + 10);
        return {
            sfuBaseUrl: {raw: MOCK_URL.toString(), parsed: MOCK_URL},
            allowedSfuHostnameSuffixes: [MOCK_URL.hostname],
            sfuToken: 'lolroflxD#cringe',
            expiration,
        };
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async identity(identity: IdentityString): Promise<IdentityData> {
        const data = this._knownUsers[identity];
        return (
            data ?? {
                identity,
                state: ActivityState.INVALID,
            }
        );
    }

    public async identities(
        identities: IdentityString[],
    ): Promise<Map<IdentityString, IdentityData>> {
        const data = new Map<IdentityString, IdentityData>();
        for (const identity of identities) {
            data.set(identity, await this.identity(identity));
        }
        return data;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async privateData(
        identity: IdentityString,
        ck: ClientKey,
    ): Promise<IdentityPrivateData> {
        if (this._privateData === undefined) {
            throw new DirectoryError(
                'invalid-response',
                'No private data set in TestDirectoryBackend',
            );
        }
        return this._privateData;
    }
}

class TestSfuHttpBackend implements SfuHttpBackend {
    // eslint-disable-next-line @typescript-eslint/require-await
    public async peek(data: GroupCallBaseData, token: SfuToken): Promise<PeekResponse | undefined> {
        return {startedAt: new Date(), maxParticipants: 1337, participants: []};
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async join(
        data: GroupCallBaseData,
        fingerprint: DtlsFingerprint,
        token: SfuToken,
    ): Promise<JoinResponse> {
        throw new GroupCallError({kind: 'sfu-timeout'}, 'Bad luck, mate');
    }
}

interface LogEntry {
    level: 'debug' | 'trace' | 'info' | 'warn' | 'error';
    line: string;
}
/**
 * Store logs in strings. Allow printing them.
 */
export class StringLogger implements Logger {
    public readonly prefix: undefined;
    private readonly _logs: LogEntry[] = [];

    public debug(...data: readonly unknown[]): void {
        this._log('debug', data);
    }

    public trace(...data: readonly unknown[]): void {
        this._log('trace', data);
    }

    public info(...data: readonly unknown[]): void {
        this._log('info', data);
    }

    public warn(...data: readonly unknown[]): void {
        this._log('warn', data);
    }

    public error(...data: readonly unknown[]): void {
        this._log('error', data);
    }

    /**
     * Works like {@link assert} but also logs a failed assertion to the
     * console.
     */
    public assert(condition: boolean, ...data: readonly unknown[]): asserts condition {
        if (!condition) {
            const message = `Assertion failed: ${data.join(' ')}`;
            this.error(message);
            throw new Error(message);
        }
    }

    /**
     * Print logs to stdout.
     */
    public printLogs(): void {
        for (const entry of this._logs) {
            console.log(`[${entry.level}] ${entry.line}`);
        }
    }

    private _log(level: LogEntry['level'], ...data: readonly unknown[]): void {
        let line = '';
        for (const entry of data) {
            line += String(entry);
        }
        this._logs.push({level, line});
    }
}

export class TestLoggerFactory implements LoggerFactory {
    private readonly _logger = new StringLogger();

    public constructor(private readonly _rootTag: string) {}

    /** @inheritdoc */
    public logger(tag: string, style?: string): Logger {
        // Create logger instance
        return new TagLogger(
            this._logger,
            {
                tag: `${this._rootTag}.${tag}`,
                style: ' ',
            },
            [tag, style],
        );
    }

    public printLogs(): void {
        this._logger.printLogs();
    }
}

class UserRepository implements User {
    public readonly displayName: LocalStore<string>;
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    public identity: IdentityString;
    public profilePicture: LocalStore<ProfilePictureView>;
    public profileSettings: ModelStore<ProfileSettings>;
    public privacySettings: ModelStore<PrivacySettings>;
    public callsSettings: ModelStore<CallsSettings>;
    public devicesSettings: ModelStore<DevicesSettings>;
    public appearanceSettings: ModelStore<AppearanceSettings>;
    public mediaSettings: ModelStore<MediaSettings>;
    public chatSettings: ModelStore<ChatSettings>;

    public constructor(userIdentity: IdentityString, services: ServicesForModel) {
        this.identity = userIdentity;
        this.profileSettings = new ProfileSettingsModelStore(services);
        this.privacySettings = new PrivacySettingsModelStore(services);
        this.callsSettings = new CallsSettingsModelStore(services);
        this.devicesSettings = new DevicesSettingsModelStore(services);
        this.appearanceSettings = new AppearanceSettingsModelStore(services);
        this.mediaSettings = new MediaSettingsModelStore(services);
        this.chatSettings = new ChatSettingsModelStore(services);

        this.displayName = derive(
            [this.profileSettings],
            ([{currentValue: profileSettingsModel}]) =>
                profileSettingsModel.view.nickname ?? this.identity,
        );
        this.profilePicture = derive(
            [this.profileSettings],
            ([{currentValue: profileSettingsModel}]) =>
                ({
                    color: 'teal',
                    profilePicture: profileSettingsModel.view.profilePicture,
                }) as const,
        );
    }
}

class TestModelRepositories implements Repositories {
    public readonly [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    public readonly user: User;
    public readonly contacts: ContactRepository;
    public readonly groups: GroupRepository;
    public readonly conversations: ConversationRepository;
    public readonly messages: MessageRepository;
    public readonly profilePictures: ProfilePictureRepository;
    public readonly globalProperties: IGlobalPropertyRepository;
    public readonly call: CallManager;

    // Custom properties for testing
    public readonly db: DatabaseBackend;

    public constructor(
        userIdentity: IdentityString,
        services_: Omit<ServicesForBackend, 'model' | 'viewModel'>,
        db: SqliteDatabaseBackend,
    ) {
        this.db = db;
        const services = {...services_, db: this.db, model: this};

        this.user = new UserRepository(userIdentity, services);
        this.contacts = new ContactModelRepository(services);
        this.groups = new GroupModelRepository(services);
        this.conversations = new ConversationModelRepository(services);
        this.messages = new MessageModelRepository(services);
        this.profilePictures = new ProfilePictureModelRepository(services);
        this.globalProperties = new GlobalPropertyRepository(services);
        this.call = new CallManager(services);
    }

    public static create(
        userIdentity: IdentityString,
        services: Omit<ServicesForBackend, 'model' | 'viewModel' | 'persistentProtocolState'>,
    ): {
        readonly model: TestModelRepositories;
        readonly persistentProtocolState: PersistentProtocolStateBackend;
    } {
        const db = initSqliteBackend(services.logging.logger('db'));
        const persistentProtocolState = new PersistentProtocolStateBackend({
            db,
            logging: services.logging,
        });
        return {
            model: new TestModelRepositories(
                userIdentity,
                {
                    ...services,
                    persistentProtocolState,
                },
                db,
            ),
            persistentProtocolState,
        };
    }
}

export class TestNonceService implements INonceService {
    public checkAndRegisterNonce(scope: NonceScope, nonce: Nonce): INonceGuard {
        return {
            nonce,
            processed: new ValueObject(false),
            commit: () => {
                /* No-op */
            },
            discard: () => {
                /* No-op */
            },
        };
    }
    public getRandomNonce(scope: NonceScope): INonceGuard {
        return {
            nonce: ensureNonce(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            processed: new ValueObject(false),
            commit: () => {
                /* No-op */
            },
            discard: () => {
                /* No-op */
            },
        };
    }
    public getAllPersistedNonces(scope: NonceScope): ReadonlySet<NonceHash> {
        return new Set();
    }
    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {}
}

class TestNotificationService extends NotificationService {
    public constructor(log: Logger) {
        // Mock remote NotificationCreator
        // eslint-disable-next-line @typescript-eslint/require-await
        async function create(
            notification: CustomNotification,
        ): Promise<NotificationHandle | undefined> {
            return undefined;
        }
        super(log, {create} as RemoteProxy<NotificationCreator>);
    }
}

class TestMediaService extends BackendMediaService {
    public constructor(log: Logger) {
        // eslint-disable-next-line @typescript-eslint/require-await
        async function generateImageThumbnail(
            bytes: ReadonlyUint8Array,
            mediaType: string,
        ): Promise<FileBytesAndMediaType> {
            return {bytes: new Uint8Array(), mediaType};
        }
        // eslint-disable-next-line @typescript-eslint/require-await
        async function generateVideoThumbnail(
            bytes: ReadonlyUint8Array,
            mediaType: string,
        ): Promise<FileBytesAndMediaType> {
            return {bytes: new Uint8Array(), mediaType};
        }
        function refreshThumbnailCacheForMessage(
            messageId: MessageId,
            receiverLookup: DbReceiverLookup,
        ): void {}
        super(log, {
            generateImageThumbnail,
            generateVideoThumbnail,
            refreshThumbnailCacheForMessage,
        } as RemoteProxy<IFrontendMediaService>);
    }
}

const open = (async (dialog: SystemDialog) =>
    await Promise.resolve({
        closed: new ResolvablePromise({uncaught: 'default'}),
    } as const)) as unknown as Remote<(dialog: SystemDialog) => SystemDialogHandle>;

const TEST_SYSTEM_DIALOG_SERVICE: Remote<SystemDialogService> = {
    open,
} as unknown as Remote<SystemDialogService>;

class TestBlobBackend implements BlobBackend {
    // eslint-disable-next-line @typescript-eslint/require-await
    public async upload(scope: BlobScope, data: EncryptedData): Promise<BlobId> {
        return ensureBlobId(nodeRandomBytes(16));
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async download(scope: BlobScope, id: BlobId): Promise<BlobDownloadResult> {
        return {
            data: nodeRandomBytes(42) as Uint8Array as EncryptedData,
            // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
            done: async (doneScope: BlobScope) => {},
        };
    }
}

class TestWorkBackend implements WorkBackend {
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    // eslint-disable-next-line @typescript-eslint/require-await
    public async checkLicense(): Promise<WorkLicenseStatus> {
        return {valid: true};
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async contacts(): Promise<WorkContacts> {
        return {contacts: []};
    }
}

export interface TestServices extends ServicesForBackend {
    // Raw client key bytes for testing purposes
    readonly rawClientKeyBytes: Uint8Array;

    // Use concrete types for some test services
    readonly directory: TestDirectoryBackend;
    readonly logging: TestLoggerFactory;
    readonly model: TestModelRepositories;
}

interface TestKeyStorageDetails {
    appPath: string;
    keyStoragePath: string;
    keyStorage: FileSystemKeyStorage;
}

export function makeTestFileSystemKeyStorage(crypto: CryptoBackend): TestKeyStorageDetails {
    const appPath = fs.mkdtempSync(path.join(os.tmpdir(), 'threema-desktop-test-'));
    const keyStoragePath = path.join(appPath, 'key-storage.pb3');
    const keyStorage = new FileSystemKeyStorage({crypto}, NOOP_LOGGER, keyStoragePath);
    return {appPath, keyStoragePath, keyStorage};
}

export function makeTestServices(identity: IdentityString): TestServices {
    const nonces = new TestNonceService();
    const rawClientKeyBytes: Uint8Array = nodeRandomBytes(32);
    const crypto = new TestTweetNaClBackend();
    const {keyStorage} = makeTestFileSystemKeyStorage(crypto);
    const logging = new TestLoggerFactory('mocha-test');
    const rawDeviceGroupKey = wrapRawDeviceGroupKey(nodeRandomBytes(32));
    const deviceGroupBoxes = deriveDeviceGroupKeys(crypto, rawDeviceGroupKey, nonces);
    const device: Device = {
        identity: new Identity(identity),
        serverGroup: ensureServerGroup('00'),
        csp: {
            ck: SecureSharedBoxFactory.consume(
                crypto,
                nonces,
                NonceScope.CSP,
                wrapRawClientKey(Uint8Array.from(rawClientKeyBytes)),
            ) as ClientKey,
            deviceId: ensureCspDeviceId(randomU64(crypto)),
            deviceCookie: new Uint8Array(16) as ReadonlyUint8Array as DeviceCookie,
        },
        d2m: {
            deviceId: ensureD2mDeviceId(randomU64(crypto)),
            dgpk: deviceGroupBoxes.dgpk,
            dgdik: deviceGroupBoxes.dgdik,
        },
        d2d: {
            dgrk: deviceGroupBoxes.dgrk,
            dgsddk: deviceGroupBoxes.dgsddk,
            dgtsk: deviceGroupBoxes.dgtsk,
        },
    };
    const notification = new TestNotificationService(logging.logger('notifications'));
    const media = new TestMediaService(logging.logger('media'));
    const file = new InMemoryFileStorage(crypto);
    const taskManager = new TaskManager({logging});
    const endpointCache = {
        local: new LocalObjectMapper(),
        remote: new RemoteObjectMapper(),
        counter: undefined,
    };
    const systemInfo: SystemInfo = {os: 'other', arch: 'pentium386', locale: 'de_CH.utf8'};
    const services: Omit<
        TestServices,
        'rawClientKeyBytes' | 'model' | 'persistentProtocolState' | 'viewModel'
    > = {
        blob: new TestBlobBackend(),
        compressor: new ZlibCompressor(),
        config: TEST_CONFIG,
        crypto,
        device,
        directory: new TestDirectoryBackend(),
        endpoint: {
            cache: () => endpointCache,
            exposeProperties: (object: unknown) => object,
        } as unknown as EndpointService,
        file,
        keyStorage,
        logging,
        media,
        nonces,
        notification,
        sfu: new TestSfuHttpBackend(),
        systemDialog: TEST_SYSTEM_DIALOG_SERVICE,
        systemInfo,
        taskManager,
        webrtc: {
            [TRANSFER_HANDLER]: FAKE_PROXY_HANDLER,
            createGroupCallContext: () => {
                throw new GroupCallError({kind: 'webrtc-connect'}, 'Nope!');
            },
        } satisfies WebRtcService as unknown as RemoteProxy<WebRtcService>,
        work: new TestWorkBackend(),
        volatileProtocolState: new VolatileProtocolStateBackend(),
        loadingInfo: new LoadingInfo(logging.logger('loading-info')),
    };
    const {model, persistentProtocolState} = TestModelRepositories.create(identity, services);
    const viewModel = new ViewModelRepository({...services, model}, new ViewModelCache());
    return {...services, rawClientKeyBytes, model, persistentProtocolState, viewModel};
}

type OutboundNonTransactionalL4Message = Exclude<
    OutboundL4Message,
    OutboundL4D2mTransactionMessage
>;
type ReadMessageGeneratorFunction = () => InboundL4Message;
type WriteInspectorFunction = (message: OutboundNonTransactionalL4Message) => void;
type ReflectInspectorFunction = (payloads: readonly protobuf.d2d.Envelope[]) => void;
type ReflectSingleInspectorFunction = (payload: protobuf.d2d.Envelope) => void;

export type NetworkExpectation =
    | {
          mode: 'read';
          generator: ReadMessageGeneratorFunction;
          expectedInstruction: MessageFilterInstruction;
      }
    | {mode: 'write'; inspector?: WriteInspectorFunction}
    | {mode: 'reflect'; inspector?: ReflectInspectorFunction}
    | {mode: 'start-transaction'; id: u53; scope: TransactionScope};

/**
 * A network expectation models an operation on the network stack.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NetworkExpectationFactory {
    /**
     * Expect a read operation.
     *
     * Return the {@link InboundL4Message} generated by the generator function to the task and
     * expect the specified {@link MessageFilterInstruction}.
     */
    public static read(
        generator: ReadMessageGeneratorFunction,
        expectedInstruction: MessageFilterInstruction,
    ): NetworkExpectation {
        return {mode: 'read', generator, expectedInstruction};
    }

    /**
     * Expect a read operation.
     *
     * Return the specified {@link InboundL4Message} to the task and expect the specified
     * {@link MessageFilterInstruction}.
     */
    public static readMessage(
        message: InboundL4Message,
        expectedInstruction: MessageFilterInstruction,
    ): NetworkExpectation {
        return {mode: 'read', generator: () => message, expectedInstruction};
    }

    /**
     * Expect an incoming message ack to be accepted.
     */
    public static readIncomingMessageAck(
        identity: IdentityString,
        delayedMessageId: Delayed<MessageId>,
    ): NetworkExpectation {
        function generator(): InboundL4Message {
            const encoder = structbuf.bridge.encoder(structbuf.csp.payload.MessageAck, {
                identity: UTF8.encode(identity),
                messageId: delayedMessageId.unwrap(),
            });
            const encodedAck = encoder.encode(new Uint8Array(encoder.byteLength()));
            const ack = structbuf.csp.payload.MessageAck.decode(encodedAck);
            const message: InboundL4Message = {
                type: D2mPayloadType.PROXY,
                payload: {
                    type: CspPayloadType.OUTGOING_MESSAGE_ACK,
                    payload: ack,
                },
            };
            return message;
        }
        return NetworkExpectationFactory.read(generator, MessageFilterInstruction.ACCEPT);
    }

    /**
     * Expect an incoming message ack to be accepted without knowing the messageId.
     */
    public static readIncomingMessageAckWithoutMessageId(
        services: Pick<ServicesForTasks, 'crypto'>,
        identity: IdentityString,
    ): NetworkExpectation {
        function generator(): InboundL4Message {
            const encoder = structbuf.bridge.encoder(structbuf.csp.payload.MessageAck, {
                identity: UTF8.encode(identity),
                messageId: randomMessageId(services.crypto),
            });
            const encodedAck = encoder.encode(new Uint8Array(encoder.byteLength()));
            const ack = structbuf.csp.payload.MessageAck.decode(encodedAck);
            const message: InboundL4Message = {
                type: D2mPayloadType.PROXY,
                payload: {
                    type: CspPayloadType.OUTGOING_MESSAGE_ACK,
                    payload: ack,
                },
            };
            return message;
        }

        // Because we don't know the message ID, the message cannot be accepted.
        return NetworkExpectationFactory.read(
            generator,
            MessageFilterInstruction.BYPASS_OR_BACKLOG,
        );
    }

    /**
     * Expect a write operation.
     *
     * The `inspector` function passed in may be used to run arbitrary assertions about the message
     * written to the network.
     */
    public static write(inspector?: WriteInspectorFunction): NetworkExpectation {
        return {mode: 'write', inspector};
    }

    /**
     * Expect an incoming message ack to be written.
     */
    public static writeIncomingMessageAck(): NetworkExpectation {
        return NetworkExpectationFactory.write((m) => {
            assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
            assertCspPayloadType(m.payload.type, CspPayloadType.INCOMING_MESSAGE_ACK);
        });
    }

    /**
     * Expect n messages to be reflected.
     *
     * The `inspector` function passed in may be used to run arbitrary assertions about the messages
     * being reflected.
     */
    public static reflect(inspector?: ReflectInspectorFunction): NetworkExpectation {
        return {mode: 'reflect', inspector};
    }

    /**
     * Expect a single message to be reflected.
     *
     * The `inspector` function passed in may be used to run arbitrary assertions about the message
     * being reflected.
     */
    public static reflectSingle(inspector?: ReflectSingleInspectorFunction): NetworkExpectation {
        return {
            mode: 'reflect',
            inspector: (payloads) => {
                // Ensure that only a single payload is reflected, then pass it to the user-defined
                // inspector function
                expect(payloads).to.be.of.length(1);
                inspector?.(unwrap(payloads[0]));
            },
        };
    }

    public static startTransaction(id: u53, scope: TransactionScope): NetworkExpectation {
        return {mode: 'start-transaction', id, scope};
    }
}

interface TestHandleOptions {
    promotedToLeader: boolean;
}

/**
 * A mocked task handle.
 *
 * This handle is instantiated with a list of expectations. These are processed in order. If an
 * operation happens without a matching expectation, or if an expectation does not match, an
 * assertion error is raised.
 */
export class TestHandle implements ActiveTaskCodecHandle<'volatile'> {
    public controller: TaskController;
    public abort = new AbortRaiser<CloseInfo>();

    private readonly _options: TestHandleOptions;
    private readonly _expectationErrors: string[] = [];

    public constructor(
        services: ServicesForTasks,
        private readonly _expectations: NetworkExpectation[],
        options?: TestHandleOptions,
    ) {
        const {device} = services;

        this._options = {promotedToLeader: true, ...(options ?? {})};

        // Assume we're authenticated
        const authenticatedPromise = new ResolvablePromise<void>({uncaught: 'default'});
        authenticatedPromise.resolve(undefined);

        // Assume we were promoted to leader
        const promotedToLeaderPromise = new ResolvablePromise<void>({uncaught: 'default'});
        if (this._options.promotedToLeader) {
            promotedToLeaderPromise.resolve(undefined);
        }

        this.controller = {
            csp: {
                ck: device.csp.ck,
                authenticated: authenticatedPromise,
            },
            d2m: {
                authenticated: authenticatedPromise,
                promotedToLeader: promotedToLeaderPromise,
            },
            d2d: {
                dgrk: device.d2d.dgrk,
                dgtsk: device.d2d.dgtsk,
            },
        };
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async write(message: OutboundNonTransactionalL4Message): Promise<void> {
        const expectation = this._expectations.shift();
        if (expectation === undefined) {
            this._failExpectation('Write operation without expectation');
        }
        if (expectation.mode !== 'write') {
            this._failExpectation(
                `Expected ${expectation.mode} operation, but encountered write operation`,
            );
        }
        expectation.inspector?.(message);
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async read<T = undefined>(
        preprocess: (message: InboundL4Message) => TaskCodecReadInstruction<T>,
    ): Promise<T extends undefined ? undefined : T> {
        const expectation = this._expectations.shift();
        if (expectation === undefined) {
            this._failExpectation('Read operation without expectation');
        }
        if (expectation.mode !== 'read') {
            this._failExpectation(
                `Expected ${expectation.mode} operation, but encountered read operation`,
            );
        }
        const expectedMessage = expectation.generator();
        const inner = preprocess(expectedMessage);

        // Special case: 'ACCEPT' with data
        let instruction: MessageFilterInstruction;
        let data: T | undefined = undefined;
        if (inner instanceof Array) {
            [instruction, data] = inner;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (instruction !== MessageFilterInstruction.ACCEPT) {
                this._failExpectation(`Expected instruction with data to be of type 'ACCEPT'`);
            }
            if (expectation.expectedInstruction !== MessageFilterInstruction.ACCEPT) {
                this._failExpectation(
                    `Expected ${MessageFilterInstructionUtils.nameOf(
                        expectation.expectedInstruction,
                    )} instruction, but got ACCEPT`,
                );
            }
            return data as T extends undefined ? undefined : T;
        }

        // Other cases: Instructions without data
        instruction = inner;
        if (instruction !== expectation.expectedInstruction) {
            this._failExpectation(
                `Expected ${MessageFilterInstructionUtils.nameOf(
                    expectation.expectedInstruction,
                )} instruction, but got ${MessageFilterInstructionUtils.nameOf(instruction)}`,
            );
        }

        // (ノ°Д°）ノ︵ ┻━┻
        return undefined as T extends undefined ? undefined : T;
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async reflect<
        T extends
            | readonly {
                  readonly envelope: protobuf.d2d.IEnvelope;
                  readonly flags: D2mMessageFlags;
              }[]
            | [],
    >(payloads: T): Promise<{readonly [P in keyof T]: Date}> {
        const expectation = this._expectations.shift();
        if (expectation === undefined) {
            this._failExpectation('Reflect operation without expectation');
        }
        if (expectation.mode !== 'reflect') {
            this._failExpectation(
                `Expected ${expectation.mode} operation, but encountered reflect operation`,
            );
        }
        expectation.inspector?.(
            payloads.map((payload) => new protobuf.d2d.Envelope(payload.envelope)),
        );
        const reflectionTimestamps = payloads.map((payload) => new Date());
        return reflectionTimestamps as unknown as {readonly [P in keyof T]: Date};
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async transaction<S extends TransactionScope, T>(
        scope: S,
        precondition: () => boolean,
        executor: (state: TransactionRunning<S>) => Promise<T>,
    ): Promise<TransactionResult<S, T>> {
        // In this mock transaction handler, we assert that:
        //
        // - Expectation of type 'start-transaction' exists
        // - Correct scope is used
        // - Correct ID is used
        //
        // If the precondition function succeeds, the executor is run directly and "transaction
        // complete" is returned. Otherwise, "transaction aborted" is returned.

        const expectation = this._expectations.shift();
        if (expectation === undefined) {
            this._failExpectation('Transaction operation without expectation');
        }
        if (expectation.mode !== 'start-transaction') {
            this._failExpectation(
                `Expected ${expectation.mode} operation, but encountered start-transaction operation`,
            );
        }
        if (scope !== expectation.scope) {
            this._failExpectation(
                `Scope mismatch: Expected ${TransactionScopeUtils.nameOf(
                    expectation.scope,
                )} but found ${TransactionScopeUtils.nameOf(scope)}`,
            );
        }

        // Check precondition
        if (!precondition()) {
            return [_only_for_testing.transactionAborted(expectation.id, scope)];
        }

        // Run executor
        const result = await executor(_only_for_testing.transactionRunning(expectation.id, scope));

        // Return result
        return [_only_for_testing.transactionComplete(expectation.id, scope), result];
    }

    public async step<T>(executor: () => Promise<T>): Promise<T> {
        // Ensure the task has not been aborted, then run the executor
        if (this.abort.aborted) {
            throw new ConnectionClosed('abort', 'Connection aborted by task manager signal');
        }
        return await executor();
    }

    /**
     * Do some checks to ensure that the expectations were properly fulfilled:
     *
     * - Ensure that all expectations have been consumed
     * - Ensure that no expectation have failed during processing
     *
     * This method should *always* be called after using a `TestHandle`!
     */
    public finish(): void {
        assert(
            this._expectations.length === 0,
            `${this._expectations.length} expectations have not been consumed`,
        );
        if (this._expectationErrors.length !== 0) {
            const errorList = this._expectationErrors.join('\n');
            throw new Error(`The following expectation errors have been registered:\n${errorList}`);
        }
    }

    private _failExpectation(message: string): never {
        this._expectationErrors.push(message);
        throw new Error(`Expectation failed: ${message}`);
    }
}

/**
 * Helper to create a random client key.
 */
export function createClientKey(fromRawKey?: RawKey<32>): ClientKey {
    const crypto = new TestTweetNaClBackend();
    const nonces = new TestNonceService();
    const rawKey = fromRawKey ?? wrapRawKey(nodeRandomBytes(32), NACL_CONSTANTS.KEY_LENGTH);
    return SecureSharedBoxFactory.consume(crypto, nonces, NonceScope.CSP, rawKey) as ClientKey;
}

/**
 * A test user. Simplified version of a full user view.
 */
export interface TestUser {
    identity: Identity;
    ck: ClientKey;
    nickname: Nickname | undefined;
    // Default: Now
    createdAt?: Date;
    // Default: ""
    firstName?: string;
    // Default: ""
    lastName?: string;
    // Default: 0
    colorIndex?: u8;
    // Default: UNVERIFIED
    verificationLevel?: VerificationLevel;
    // Default: NONE
    workVerificationLevel?: WorkVerificationLevel;
    // Default: REGULAR
    identityType?: IdentityType;
    // Default: DIRECT
    acquaintanceLevel?: AcquaintanceLevel;
    // Default: ACTIVE
    activityState?: ActivityState;
    // Default: None
    featureMask?: FeatureMask;
    // Default: INITIAL
    syncState?: SyncState;
}

/**
 * Helper to create a simple {@link TestUser}.
 */
export function makeTestUser(
    identityString: string,
    nickname = `${identityString}'s nickname` as Nickname,
): TestUser {
    const identity = new Identity(ensureIdentityString(identityString));
    const ck = createClientKey();
    return {
        identity,
        nickname,
        ck,
    };
}

/**
 * Return the {@link ContactInit} for the specified user.
 */
export function makeContactInit(user: TestUser): ContactInit {
    return {
        identity: user.identity.string,
        publicKey: user.ck.public,
        createdAt: user.createdAt ?? new Date(),
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        nickname: user.nickname,
        colorIndex: user.colorIndex ?? 0,
        verificationLevel: user.verificationLevel ?? VerificationLevel.UNVERIFIED,
        workVerificationLevel: user.workVerificationLevel ?? WorkVerificationLevel.NONE,
        identityType: user.identityType ?? IdentityType.REGULAR,
        acquaintanceLevel: user.acquaintanceLevel ?? AcquaintanceLevel.DIRECT,
        activityState: user.activityState ?? ActivityState.ACTIVE,
        featureMask: user.featureMask ?? ensureFeatureMask(FEATURE_MASK_FLAG.NONE),
        syncState: user.syncState ?? SyncState.INITIAL,
        category: ConversationCategory.DEFAULT,
        visibility: ConversationVisibility.SHOW,
    };
}

/**
 * Register a test user in the directory.
 */
export function registerTestUser(directory: TestDirectoryBackend, user: TestUser): void {
    directory.registerUser(user.identity.string, {
        identity: user.identity.string,
        state: user.activityState ?? ActivityState.ACTIVE,
        publicKey: user.ck.public,
        featureMask: user.featureMask ?? ensureFeatureMask(FEATURE_MASK_FLAG.NONE),
        type: user.identityType ?? IdentityType.REGULAR,
    });
}

/**
 * Add a test user to the database.
 */
export function addTestUserAsContact(
    repositories: TestModelRepositories,
    user: TestUser,
): ModelStore<Contact> {
    return repositories.contacts.add.direct(makeContactInit(user));
}

export function addTestUserToFakeDirectory(directory: TestDirectoryBackend, user: TestUser): void {
    directory.registerUser(user.identity.string, {
        featureMask: FEATURE_MASK_FLAG.GROUP_SUPPORT as FeatureMask,
        identity: user.identity.string,
        publicKey: user.ck.public,
        state: ActivityState.ACTIVE,
        type: IdentityType.REGULAR,
    });
}

/**
 * A test group. Simplified version of a full group view.
 */
export interface TestGroup {
    creator: ModelStore<Contact> | 'me';
    members: ModelStore<Contact>[];
    // Default: Random
    groupId?: GroupId;
    // Default: ""
    name?: string;
    // Default: Now
    createdAt?: Date;
    // Default: GroupUserState.MEMBER
    userState?: GroupUserState;
}

/**
 * Add a test group to the database.
 */
export function addTestGroup(
    repositories: TestModelRepositories,
    group: TestGroup,
): ModelStore<Group> {
    const crypto = new TestTweetNaClBackend();
    return repositories.groups.add.direct(
        {
            creator: group.creator,
            groupId: group.groupId ?? randomGroupId(crypto),
            name: group.name ?? '',
            colorIndex: 0,
            createdAt: group.createdAt ?? new Date(),
            userState: group.userState ?? GroupUserState.MEMBER,
            category: ConversationCategory.DEFAULT,
            visibility: ConversationVisibility.SHOW,
        },
        group.members,
    );
}
