/**
 * Mocked services and other aspects of the backend.
 */
import {randomBytes} from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {expect} from 'chai';

import {type ServicesForBackend} from '~/common/backend';
import {type Config} from '~/common/config';
import {
    type CryptoBackend,
    type EncryptedData,
    ensureNonce,
    ensurePublicKey,
    NACL_CONSTANTS,
    type Nonce,
    type NonceGuard,
    type NonceHash,
    type RawKey,
    wrapRawKey,
} from '~/common/crypto';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import {deriveDeviceGroupKeys} from '~/common/crypto/device-group-keys';
import {type INonceGuard, type INonceService} from '~/common/crypto/nonce';
import {type CryptoPrng, randomU64} from '~/common/crypto/random';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {
    type DatabaseBackend,
    type DbContactUid,
    type DbReceiverLookup,
    wrapRawDatabaseKey,
} from '~/common/db';
import {type Device} from '~/common/device';
import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    GroupUserState,
    IdentityType,
    MessageFilterInstruction,
    MessageFilterInstructionUtils,
    type NonceScope,
    SyncState,
    type TransactionScope,
    TransactionScopeUtils,
    VerificationLevel,
    WorkVerificationLevel,
} from '~/common/enum';
import {ConnectionClosed} from '~/common/error';
import {InMemoryFileStorage} from '~/common/file-storage';
import {type Logger, type LoggerFactory, NOOP_LOGGER, TagLogger} from '~/common/logging';
import {
    type Contact,
    type ContactInit,
    type Group,
    type ProfilePictureView,
    type Repositories,
    type ServicesForModel,
} from '~/common/model';
import {ContactModelRepository} from '~/common/model/contact';
import {
    ConversationModelRepository,
    type ConversationModelStore,
} from '~/common/model/conversation';
import {GlobalPropertyRepository} from '~/common/model/global-property';
import {GroupModelRepository} from '~/common/model/group';
import {
    ProfilePictureModelRepository,
    type ProfilePictureRepository,
} from '~/common/model/profile-picture';
import {CallsSettingsModelStore} from '~/common/model/settings/calls';
import {PrivacySettingsModelStore} from '~/common/model/settings/privacy';
import {ProfileSettingsModelStore} from '~/common/model/settings/profile';
import {type ContactRepository} from '~/common/model/types/contact';
import {type ConversationRepository} from '~/common/model/types/conversation';
import {type GroupRepository} from '~/common/model/types/group';
import {type AnyMessageModelStore} from '~/common/model/types/message';
import {
    type CallsSettings,
    type IGlobalPropertyRepository,
    type PrivacySettings,
    type ProfileSettings,
} from '~/common/model/types/settings';
import {type User} from '~/common/model/types/user';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
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
import {
    type DirectoryBackend,
    DirectoryError,
    type IdentityData,
    type IdentityPrivateData,
} from '~/common/network/protocol/directory';
import {
    type ActiveTaskCodecHandle,
    type ServicesForTasks,
    type TaskCodecReadInstruction,
    type TaskController,
    type TransactionResult,
    type TransactionRunning,
} from '~/common/network/protocol/task';
import {_only_for_testing, TaskManager} from '~/common/network/protocol/task/manager';
import {randomGroupId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    type CspNonceGuard,
    type D2xNonceGuard,
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureFeatureMask,
    ensureIdentityString,
    ensureNickname,
    ensureServerGroup,
    type FeatureMask,
    FeatureMaskFlag,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {type ClientKey, wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {ZlibCompressor} from '~/common/node/compressor';
import {SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {FileSystemKeyStorage} from '~/common/node/key-storage';
import {
    type ExtendedNotificationOptions,
    type NotificationCreator,
    type NotificationHandle,
    NotificationService,
} from '~/common/notification';
import {
    type SystemDialog,
    type SystemDialogHandle,
    type SystemDialogService,
} from '~/common/system-dialog';
import {type u8, type u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {type Delayed} from '~/common/utils/delayed';
import {
    type EndpointService,
    LocalObjectMapper,
    type PROXY_HANDLER,
    type Remote,
    RemoteObjectMapper,
    type RemoteProxy,
    TRANSFER_HANDLER,
} from '~/common/utils/endpoint';
import {Identity} from '~/common/utils/identity';
import {ValueObject} from '~/common/utils/object';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {type AbortSubscriber} from '~/common/utils/signal';
import {type LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {GlobalTimer} from '~/common/utils/timer';
import {type IViewModelRepository} from '~/common/viewmodel';
import {
    type ContactListItemSetEntry,
    type ContactListItemSetStore,
    getContactListItemSetStore,
    getContactListItemStore,
} from '~/common/viewmodel/contact-list-item';
import {type ConversationViewModel} from '~/common/viewmodel/conversation';
import {
    type ConversationMessageViewModelBundle,
    getConversationMessageViewModelBundle,
} from '~/common/viewmodel/conversation-message';
import {
    type ConversationMessageSetStore,
    getConversationMessageSetStore,
} from '~/common/viewmodel/conversation-message-set';
import {
    type ConversationPreviewSetStore,
    type ConversationPreviewTranslationsStore,
    getConversationPreviewSetStore,
} from '~/common/viewmodel/conversation-preview';
import {type DebugPanelViewModel, getDebugPanelViewModel} from '~/common/viewmodel/debug-panel';
import {
    getGroupListItemSetStore,
    type GroupListItemSetStore,
} from '~/common/viewmodel/group-list-item';
import {getProfileViewModelStore, type ProfileViewModelStore} from '~/common/viewmodel/profile';

import {assertCspPayloadType, assertD2mPayloadType} from './assertions';

export class TestCrypto extends TweetNaClBackend {}

const UNCONNECTABLE_URL = 'http = //127.0.0.1:99999';
const FAKE_PROXY_HANDLER = undefined as unknown as typeof PROXY_HANDLER;

export class TestConfig implements Config {
    /* eslint-disable @typescript-eslint/naming-convention */
    public readonly CHAT_SERVER_KEY = ensurePublicKey(randomBytes(32));
    public readonly MEDIATOR_SERVER_URL = UNCONNECTABLE_URL;
    public readonly MEDIATOR_FRAME_MIN_BYTE_LENGTH = 4;
    public readonly MEDIATOR_FRAME_MAX_BYTE_LENGTH = 65536;
    public readonly MEDIATOR_RECONNECTION_DELAY_S = 1;
    public readonly DIRECTORY_SERVER_URL = UNCONNECTABLE_URL;
    public readonly BLOB_SERVER_URL = UNCONNECTABLE_URL;
    public readonly RENDEZVOUS_SERVER_URL = UNCONNECTABLE_URL;
    public readonly UPDATE_SERVER_URL = UNCONNECTABLE_URL;
    public readonly DEBUG_PACKET_CAPTURE_HISTORY_LENGTH = 100;
    public readonly KEY_STORAGE_PATH = ['/tmp/desktop-mocha-tests'];
    public readonly FILE_STORAGE_PATH = ['/tmp/desktop-mocha-tests'];
    public readonly DATABASE_PATH = ':memory:';
    public readonly USER_AGENT = 'Threema Desktop Mocha Tests';
    public readonly LOGGING = {
        ENDPOINT_COMMUNICATION: true,
    };
    /* eslint-enable @typescript-eslint/naming-convention */
}

export class TestTweetNaClBackend extends TweetNaClBackend {
    public constructor() {
        // eslint-disable-next-line func-style
        const crpytoPrng: CryptoPrng = (buffer) => {
            const array =
                buffer instanceof Uint8Array
                    ? buffer
                    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
            array.set(randomBytes(array.byteLength));
            return buffer;
        };
        super(crpytoPrng);
    }
}

export class NoopNonceGuard implements NonceGuard {
    public use(nonce: Nonce): void {
        // No-op
    }
}

export function initSqliteBackend(logger: Logger): SqliteDatabaseBackend {
    // Instantiate SQLite backend, backed by in-memory table
    const dbKey = wrapRawDatabaseKey(new Uint8Array(32));
    const backend = SqliteDatabaseBackend.create(logger, ':memory:', dbKey);

    // Run migrations
    backend.runMigrations();

    return backend;
}

/**
 * A test directory backend that allows registering data that should be returned by the mocked
 * directory.
 */
export class TestDirectoryBackend implements DirectoryBackend {
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    private readonly _knownUsers: Record<IdentityString, IdentityData | undefined> = {};
    private _privateData: IdentityPrivateData | undefined = undefined;

    public registerUser(identity: IdentityString, data: IdentityData): void {
        this._knownUsers[identity] = data;
    }

    public setPrivateData(privateData: IdentityPrivateData): void {
        this._privateData = privateData;
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async identity(identity: IdentityString): Promise<IdentityData> {
        const data = this._knownUsers[identity];
        return data !== undefined
            ? data
            : {
                  identity,
                  state: ActivityState.INVALID,
              };
    }

    /** @inheritdoc */
    public async identities(
        identities: IdentityString[],
    ): Promise<Record<IdentityString, IdentityData>> {
        const data: Record<IdentityString, IdentityData> = {};
        for (const identity of identities) {
            data[identity] = await this.identity(identity);
        }
        return data;
    }

    /** @inheritdoc */
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

class TestLoggerFactory implements LoggerFactory {
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
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    public identity: IdentityString;
    public profilePicture: LocalStore<ProfilePictureView>;
    public readonly displayName: LocalStore<string>;
    public profileSettings: LocalModelStore<ProfileSettings>;
    public privacySettings: LocalModelStore<PrivacySettings>;
    public callsSettings: LocalModelStore<CallsSettings>;

    public constructor(userIdentity: IdentityString, services: ServicesForModel) {
        this.identity = userIdentity;
        this.profileSettings = new ProfileSettingsModelStore(services, {
            nickname: ensureNickname('Mocha Tests'),
            profilePictureShareWith: {group: 'everyone'},
        });
        this.privacySettings = new PrivacySettingsModelStore(services, {});
        this.callsSettings = new CallsSettingsModelStore(services, {});

        this.displayName = derive(this.profileSettings, ({view: {nickname}}) =>
            nickname === undefined ? this.identity : nickname,
        );
        this.profilePicture = derive(
            this.profileSettings,
            (profileSettings) =>
                ({
                    color: 'teal',
                    profilePicture: profileSettings.view.profilePicture,
                } as const),
        );
    }
}

export class TestModelRepositories implements Repositories {
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    public user: User;
    public contacts: ContactRepository;
    public groups: GroupRepository;
    public conversations: ConversationRepository;
    public profilePictures: ProfilePictureRepository;
    public globalProperties: IGlobalPropertyRepository;
    public db: DatabaseBackend;

    public constructor(
        userIdentity: IdentityString,
        services: Omit<ServicesForBackend, 'model' | 'viewModel'>,
    ) {
        this.db = initSqliteBackend(services.logging.logger('db'));
        const servicesForModel = {...services, db: this.db, model: this};
        this.user = new UserRepository(userIdentity, servicesForModel);
        this.contacts = new ContactModelRepository(servicesForModel);
        this.groups = new GroupModelRepository(servicesForModel);
        this.conversations = new ConversationModelRepository(servicesForModel);
        this.profilePictures = new ProfilePictureModelRepository(servicesForModel);
        this.globalProperties = new GlobalPropertyRepository(servicesForModel);
    }
}

export class TestViewModel implements IViewModelRepository {
    public [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;

    public constructor(private readonly _services: Omit<ServicesForBackend, 'viewModel'>) {}

    public conversationPreviews(
        translations: ConversationPreviewTranslationsStore,
    ): ConversationPreviewSetStore {
        return getConversationPreviewSetStore(this._services, this, translations);
    }

    public conversation(receiver: DbReceiverLookup): ConversationViewModel | undefined {
        return undefined;
    }

    public conversationMessageSet(
        conversation: ConversationModelStore,
    ): ConversationMessageSetStore {
        return getConversationMessageSetStore(this, conversation);
    }

    public conversationMessage(
        conversation: ConversationModelStore,
        messageStore: AnyMessageModelStore,
    ): ConversationMessageViewModelBundle {
        return getConversationMessageViewModelBundle(this._services, messageStore, conversation);
    }

    public conversationMessageById(
        conversation: ConversationModelStore,
        messageId: MessageId,
    ): ConversationMessageViewModelBundle | undefined {
        const messageStore = conversation.get().controller.getMessage(messageId);
        if (messageStore === undefined) {
            return undefined;
        }
        return this.conversationMessage(conversation, messageStore);
    }

    public contactListItems(): ContactListItemSetStore {
        return getContactListItemSetStore(this._services);
    }

    public contactListItem(uid: DbContactUid): LocalStore<ContactListItemSetEntry> | undefined {
        return getContactListItemStore(this._services, uid);
    }

    public groupListItems(): GroupListItemSetStore {
        return getGroupListItemSetStore(this._services);
    }

    public profile(): ProfileViewModelStore {
        return getProfileViewModelStore(this._services);
    }

    public debugPanel(): DebugPanelViewModel {
        return getDebugPanelViewModel(this._services);
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
    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {
        return;
    }
}

export class TestNotificationService extends NotificationService {
    public constructor(log: Logger) {
        // Mock remote NotificationCreator
        // eslint-disable-next-line @typescript-eslint/require-await
        async function create(
            title: string,
            options: ExtendedNotificationOptions,
        ): Promise<NotificationHandle | undefined> {
            return undefined;
        }
        super(log, {create} as RemoteProxy<NotificationCreator>);
    }
}

const open = (async (dialog: SystemDialog) =>
    await Promise.resolve({
        closed: new ResolvablePromise(),
    } as const)) as unknown as Remote<(dialog: SystemDialog) => SystemDialogHandle>;

const TEST_SYSTEM_DIALOG_SERVICE: Remote<SystemDialogService> = {
    open,
} as unknown as Remote<SystemDialogService>;

export class TestBlobBackend implements BlobBackend {
    // eslint-disable-next-line @typescript-eslint/require-await
    public async upload(scope: BlobScope, data: EncryptedData): Promise<BlobId> {
        return ensureBlobId(randomBytes(16));
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async download(scope: BlobScope, id: BlobId): Promise<BlobDownloadResult> {
        return {
            data: randomBytes(42) as Uint8Array as EncryptedData,
            // eslint-disable-next-line @typescript-eslint/require-await, @typescript-eslint/no-empty-function
            done: async (doneScope: BlobScope) => {},
        };
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
    const rawClientKeyBytes: Uint8Array = randomBytes(32);
    const crypto = new TestTweetNaClBackend();
    const {keyStorage} = makeTestFileSystemKeyStorage(crypto);
    const logging = new TestLoggerFactory('mocha-test');
    const rawDeviceGroupKey = wrapRawDeviceGroupKey(randomBytes(32));
    const cspNonceGuard = new NoopNonceGuard() as CspNonceGuard;
    const d2xNonceGuard = new NoopNonceGuard() as D2xNonceGuard;
    const deviceGroupBoxes = deriveDeviceGroupKeys(crypto, rawDeviceGroupKey, d2xNonceGuard);
    const device: Device = {
        identity: new Identity(identity),
        serverGroup: ensureServerGroup('00'),
        csp: {
            ck: SecureSharedBoxFactory.consume(
                crypto,
                wrapRawClientKey(Uint8Array.from(rawClientKeyBytes)),
            ) as ClientKey,
            deviceId: ensureCspDeviceId(randomU64(crypto)),
            nonceGuard: cspNonceGuard,
        },
        d2m: {
            deviceId: ensureD2mDeviceId(randomU64(crypto)),
            nonceGuard: d2xNonceGuard,
            dgpk: deviceGroupBoxes.dgpk,
            dgdik: deviceGroupBoxes.dgdik,
        },
        d2d: {
            nonceGuard: d2xNonceGuard,
            dgrk: deviceGroupBoxes.dgrk,
            dgsddk: deviceGroupBoxes.dgsddk,
            dgtsk: deviceGroupBoxes.dgtsk,
        },
    };
    const notification = new TestNotificationService(logging.logger('notifications'));
    const nonces = new TestNonceService();
    const file = new InMemoryFileStorage(crypto);
    const taskManager = new TaskManager({logging});
    const endpointCache = {
        local: new LocalObjectMapper(),
        remote: new RemoteObjectMapper(),
        counter: undefined,
    };

    const partialServices = {
        config: new TestConfig(),
        crypto,
        device,
        directory: new TestDirectoryBackend(),
        keyStorage,
        logging,
        nonces,
        notification,
        compressor: new ZlibCompressor(),
        blob: new TestBlobBackend(),
        systemDialog: TEST_SYSTEM_DIALOG_SERVICE,
        file,
        endpoint: {
            cache: () => endpointCache,
        } as unknown as EndpointService,
        taskManager,
        timer: new GlobalTimer(),
    };
    const model = new TestModelRepositories(identity, partialServices);
    const viewModel = new TestViewModel({...partialServices, model});
    return {...partialServices, model, rawClientKeyBytes, viewModel};
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
                inspector?.(payloads[0]);
            },
        };
    }

    public static startTransaction(id: u53, scope: TransactionScope): NetworkExpectation {
        return {mode: 'start-transaction', id, scope};
    }
}

export interface TestHandleOptions {
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
        const authenticatedPromise = new ResolvablePromise<void>();
        authenticatedPromise.resolve(undefined);

        // Assume we were promoted to leader
        const promotedToLeaderPromise = new ResolvablePromise<void>();
        if (this._options.promotedToLeader) {
            promotedToLeaderPromise.resolve(undefined);
        }

        this.controller = {
            csp: {
                nonceGuard: device.csp.nonceGuard,
                ck: device.csp.ck,
                authenticated: authenticatedPromise,
            },
            d2m: {
                authenticated: authenticatedPromise,
                promotedToLeader: promotedToLeaderPromise,
            },
            d2d: {
                nonceGuard: device.d2d.nonceGuard,
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
        instruction = inner as MessageFilterInstruction;
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
    public async reflect<T extends readonly protobuf.d2d.IEnvelope[] | []>(
        payloads: T,
    ): Promise<{readonly [P in keyof T]: Date}> {
        const expectation = this._expectations.shift();
        if (expectation === undefined) {
            this._failExpectation('Reflect operation without expectation');
        }
        if (expectation.mode !== 'reflect') {
            this._failExpectation(
                `Expected ${expectation.mode} operation, but encountered reflect operation`,
            );
        }
        expectation.inspector?.(payloads.map((payload) => new protobuf.d2d.Envelope(payload)));
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

    // Abort handler
    // eslint-disable-next-line @typescript-eslint/member-ordering
    public abort = {
        aborted: false,
        subscribe: (subscriber: AbortSubscriber) => () => undefined,
    };

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
    const rawKey = fromRawKey ?? wrapRawKey(randomBytes(32), NACL_CONSTANTS.KEY_LENGTH);
    return SecureSharedBoxFactory.consume(crypto, rawKey) as ClientKey;
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
        featureMask: user.featureMask ?? ensureFeatureMask(FeatureMaskFlag.NONE),
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
        featureMask: user.featureMask ?? ensureFeatureMask(FeatureMaskFlag.NONE),
        type: user.identityType ?? IdentityType.REGULAR,
    });
}

/**
 * Add a test user to the database.
 */
export function addTestUserAsContact(
    repositories: TestModelRepositories,
    user: TestUser,
): LocalModelStore<Contact> {
    return repositories.contacts.add.fromSync(makeContactInit(user));
}

export function addTestUserToFakeDirectory(directory: TestDirectoryBackend, user: TestUser): void {
    directory.registerUser(user.identity.string, {
        featureMask: FeatureMaskFlag.GROUP_SUPPORT as FeatureMask,
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
    creatorIdentity: IdentityString;
    members: DbContactUid[];
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
): LocalModelStore<Group> {
    const crypto = new TestTweetNaClBackend();
    return repositories.groups.add.fromSync(
        {
            creatorIdentity: group.creatorIdentity,
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
