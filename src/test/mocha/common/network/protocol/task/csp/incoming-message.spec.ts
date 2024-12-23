import {expect} from 'chai';

import type {ServicesForBackend} from '~/common/backend';
import {NONCE_UNGUARDED_SCOPE, type PlainData} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {deriveMessageMetadataKey} from '~/common/crypto/csp-keys';
import {
    CspE2eConversationType,
    CspE2eDeliveryReceiptStatus,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eMessageUpdateType,
    MessageType,
    ReceiverType,
    TransactionScope,
    UnknownContactPolicy,
} from '~/common/enum';
import type {Conversation} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {AnyTextMessageModelStore} from '~/common/model/types/message';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {BlobId} from '~/common/network/protocol/blob';
import {
    BLOB_FILE_NONCE,
    BLOB_THUMBNAIL_NONCE,
    MESSAGE_DATA_PADDING_LENGTH_MIN,
} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {IncomingGroupNameTask} from '~/common/network/protocol/task/csp/incoming-group-name';
import {IncomingMessageTask} from '~/common/network/protocol/task/csp/incoming-message';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {MessageWithMetadataBoxLike} from '~/common/network/structbuf/csp/payload';
import type {FileRenderingType} from '~/common/network/structbuf/validate/csp/e2e/file';
import {
    ensureIdentityString,
    ensureMessageId,
    ensureNickname,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import type {ByteLengthEncoder, Dimensions, f64, u8, u53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {dateToUnixTimestampMs, dateToUnixTimestampS, intoUnsignedLong} from '~/common/utils/number';
import {hasPropertyStrict} from '~/common/utils/object';
import {
    addTestGroup,
    addTestUserAsContact,
    addTestUserToFakeDirectory,
    createClientKey,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    TestNonceService,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';
import {makeGroup, randomBlobKey} from '~/test/mocha/common/db-backend-tests';
import {
    reflectAndSendDeliveryReceipt,
    reflectAndSendGroupSyncRequest,
    reflectContactSync,
} from '~/test/mocha/common/network/protocol/task/task-test-helpers';

/**
 * Create a message from {@link sender} to {@link receiver} and with the {@link innerPayload} used
 * as the inner payload of the legacy message.
 *
 * Certain message properties can be overridden using the {@link overrides}:
 *
 * - `messageId`: Sets the legacy message ID of the message. If not set, a random message ID is
 *   used.
 * - `nickname`: Sets the legacy nickname of the message. If not set, the nickname of the
 *   {@link sender} is used.
 * - `metadata.messageId`: Sets the message ID in the encrypted metadata. If not set, fall back to
 *   the legacy message ID.
 * - `metadata.nickname`: Sets the nickname in the encrypted metadata. If not set, fall back to the
 *   legacy nickname.
 */
function createMessage(
    services: ServicesForBackend,
    sender: TestUser,
    receiver: IdentityString,
    type: u8,
    innerPayload: ByteLengthEncoder,
    flags: CspMessageFlags,
    overrides?: {
        readonly messageId?: MessageId;
        readonly nickname?: string | undefined;
        readonly metadata?: {
            readonly messageId?: MessageId;
            readonly nickname?: string | undefined;
        };
    },
): structbuf.csp.payload.MessageWithMetadataBoxLike {
    const {crypto, device} = services;
    const createdAt = new Date();

    const messageId = overrides?.messageId ?? randomMessageId(crypto);

    const legacyNickname =
        overrides !== undefined && hasPropertyStrict(overrides, 'nickname')
            ? overrides.nickname
            : sender.nickname;
    const metadataNickname =
        overrides?.metadata !== undefined && hasPropertyStrict(overrides.metadata, 'nickname')
            ? overrides.metadata.nickname
            : legacyNickname;

    const [messageAndMetadataNonce, metadataContainer] = deriveMessageMetadataKey(
        {crypto, nonces: new TestNonceService()},
        device.csp.ck,
        sender.ck.public,
    )
        .encryptor(
            CREATE_BUFFER_TOKEN,
            protobuf.utils.encoder(protobuf.csp_e2e.MessageMetadata, {
                padding: new Uint8Array(0),
                nickname: metadataNickname,
                messageId: intoUnsignedLong(overrides?.metadata?.messageId ?? messageId),
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
            }),
        )
        .encryptWithRandomNonce('incoming-message.spec.ts#createMessage');
    const messageBox = device.csp.ck
        .getSharedBox(sender.ck.public)
        .encryptor(
            CREATE_BUFFER_TOKEN,
            structbuf.bridge.encoder(structbuf.csp.e2e.Container, {
                type,
                paddedData: structbuf.bridge.pkcs7PaddedEncoder(
                    crypto,
                    MESSAGE_DATA_PADDING_LENGTH_MIN,
                    innerPayload,
                ),
            }),
        )
        .encryptWithDangerousUnguardedNonce(messageAndMetadataNonce);
    return {
        senderIdentity: sender.identity.bytes,
        receiverIdentity: UTF8.encode(receiver),
        messageId,
        createdAt: dateToUnixTimestampS(createdAt),
        flags: flags.toBitmask(),
        reserved: 0x00,
        metadataLength: metadataContainer.byteLength,
        legacySenderNickname: UTF8.encode(legacyNickname ?? ''),
        metadataContainer,
        messageAndMetadataNonce,
        messageBox,
    };
}

/**
 * Get a incoming text message task from a specific user.
 *
 * @returns a task for an incoming message
 */
function createNewIncomingTextMessageTask(
    services: TestServices,
    user: TestUser,
    me: IdentityString,
    messageText = 'this is the secret message',
    messageId?: MessageId,
): IncomingMessageTask {
    const textMessage = createMessage(
        services,
        user,
        me,
        CspE2eConversationType.TEXT,
        structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
            text: UTF8.encode(messageText),
        }),
        CspMessageFlags.fromPartial({sendPushNotification: true}),
        {messageId},
    );

    return new IncomingMessageTask(services, textMessage);
}

function createNewEditMessageTask(
    services: TestServices,
    user: TestUser,
    me: IdentityString,
    messageId: MessageId,
    messageText = 'This message was changed',
): IncomingMessageTask {
    const editMessage = createMessage(
        services,
        user,
        me,
        CspE2eMessageUpdateType.EDIT_MESSAGE,
        protobuf.utils.encoder(protobuf.csp_e2e.EditMessage, {
            text: messageText,
            messageId: intoUnsignedLong(messageId),
        }),
        CspMessageFlags.fromPartial({sendPushNotification: true}),
    );

    return new IncomingMessageTask(services, editMessage);
}

function createNewDeleteMessageTask(
    services: TestServices,
    user: TestUser,
    me: IdentityString,
    messageId: MessageId,
): IncomingMessageTask {
    const deleteMessage = createMessage(
        services,
        user,
        me,
        CspE2eMessageUpdateType.DELETE_MESSAGE,
        protobuf.utils.encoder(protobuf.csp_e2e.DeleteMessage, {
            messageId: intoUnsignedLong(messageId),
        }),
        CspMessageFlags.fromPartial({sendPushNotification: true}),
    );

    return new IncomingMessageTask(services, deleteMessage);
}

/**
 * Test incoming message task.
 */
export function run(): void {
    describe('IncomingMessageTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
            ck: createClientKey(),
        };

        // Set up services and log printing
        let services: TestServices;
        this.beforeEach(function () {
            services = makeTestServices(me);
            // Make sure the tasks have no side effects
            services.persistentProtocolState.setLastUserProfileDistributionState(
                user1.identity.string,
                {
                    type: 'removed',
                },
                new Date(),
            );

            services.persistentProtocolState.setLastUserProfileDistributionState(
                user2.identity.string,
                {
                    type: 'removed',
                },
                new Date(),
            );
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        describe('validation', function () {
            it('discard messages that appear to be sent by ourselves', async function () {
                const {device, model} = services;

                // Encode and encrypt message
                const message = createMessage(
                    services,
                    {
                        identity: new Identity(me),
                        ck: device.csp.ck,
                        nickname: 'me myself' as Nickname,
                    },
                    me,
                    CspE2eGroupControlType.GROUP_LEAVE,
                    structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('hello from myself'),
                    }),
                    CspMessageFlags.none(),
                );

                // Run task
                const task = new IncomingMessageTask(services, message);
                const expectations: NetworkExpectation[] = [
                    // We expect the message to be dropped because it's invalid
                    NetworkExpectationFactory.writeIncomingMessageAck(),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                // Ensure that no text message was created
                const contactForOwnIdentity = model.contacts.getByIdentity(me);
                expect(contactForOwnIdentity, 'Contact for own identity should not exist').to.be
                    .undefined;
            });

            it('discard messages where the message id of the metadata does not match', async function () {
                const {model} = services;

                // Add contacts
                const user1Contact = addTestUserAsContact(model, user1);

                // Get user conversation
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });
                assert(conversation !== undefined, 'Conversation with user 1 not found');
                expect(conversation.get().controller.getAllMessages().get().size).to.equal(0);

                // Encode and encrypt message
                const message = createMessage(
                    services,
                    {
                        identity: user1.identity,
                        ck: user1.ck,
                        nickname: 'some user' as Nickname,
                    },
                    me,
                    CspE2eConversationType.TEXT,
                    structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('hi'),
                    }),
                    CspMessageFlags.none(),
                    {
                        messageId: ensureMessageId(123456n),
                        metadata: {
                            messageId: ensureMessageId(123457n),
                        },
                    },
                );

                // Run task
                const task = new IncomingMessageTask(services, message);
                const expectations: NetworkExpectation[] = [
                    // We expect the message to be dropped because the metadata message ID mismatches
                    NetworkExpectationFactory.writeIncomingMessageAck(),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                // Ensure that no text message was created
                const contactForOwnIdentity = model.contacts.getByIdentity(me);
                expect(contactForOwnIdentity, 'Contact for own identity should not exist').to.be
                    .undefined;
            });
        });

        describe('contact management', function () {
            it('updates nickname for existing contacts', async function () {
                const {model} = services;

                const oldNickname = ensureNickname('oldnick');
                const newNickname = ensureNickname('newnick');

                // Add contact with old nickname
                const user1Contact = addTestUserAsContact(model, {...user1, nickname: oldNickname});
                expect(user1Contact.get().view.nickname).to.equal(oldNickname);

                async function processMessageWithNickname(
                    legacyNickname: Nickname | '',
                    metadataNickname: Nickname | '' | undefined,
                    expectContactReflection: boolean,
                ): Promise<void> {
                    // Create message from user 1 with the specified nickname
                    const textMessage = createMessage(
                        services,
                        user1,
                        me,
                        CspE2eConversationType.TEXT,
                        structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                            text: UTF8.encode('message'),
                        }),
                        CspMessageFlags.fromPartial({sendPushNotification: true}),
                        {nickname: legacyNickname, metadata: {nickname: metadataNickname}},
                    );

                    // Run task
                    const task = new IncomingMessageTask(services, textMessage);
                    const handle = new TestHandle(services, [
                        // Reflect contact update if requested
                        ...(expectContactReflection ? reflectContactSync(user1, 'update') : []),

                        // Reflect and ack incoming text message
                        NetworkExpectationFactory.reflectSingle((payload) => {
                            expect(payload.incomingMessage).not.to.be.undefined;
                            const incomingMessage = unwrap(payload.incomingMessage);
                            expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                            expect(incomingMessage.type).to.equal(
                                protobuf.common.CspE2eMessageType.TEXT,
                            );
                        }),
                        NetworkExpectationFactory.writeIncomingMessageAck(),

                        // Send delivery receipt
                        ...reflectAndSendDeliveryReceipt(
                            services,
                            user1,
                            CspE2eDeliveryReceiptStatus.RECEIVED,
                        ),
                    ]);
                    await task.run(handle);
                    handle.finish();
                }

                // When the nickname is unchanged, no contact update should be reflected
                await processMessageWithNickname(oldNickname, oldNickname, false);
                expect(user1Contact.get().view.nickname).to.equal(oldNickname);

                // When the nickname is changed, a contact update should be reflected
                await processMessageWithNickname(newNickname, newNickname, true);
                expect(user1Contact.get().view.nickname).to.equal(newNickname);

                // When the nickname is cleared, a contact update should be reflected...
                await processMessageWithNickname('', '', true);
                expect(user1Contact.get().view.nickname).to.be.undefined;

                // ...but only if nickname isn't already undefined.
                await processMessageWithNickname('', '', false);
                expect(user1Contact.get().view.nickname).to.be.undefined;

                // If both legacy and encrypted metadata nickname are set, the latter wins
                await processMessageWithNickname(oldNickname, newNickname, true);
                expect(user1Contact.get().view.nickname).to.be.equal(newNickname);
            });

            it("creates a new contact for an unknown contact's text message", async function () {
                const {model, directory} = services;

                addTestUserToFakeDirectory(directory, user1);

                // Verify contact absence
                const user1ContactBefore = model.contacts.getByIdentity(user1.identity.string);
                expect(
                    user1ContactBefore,
                    'Contact user1 should not exist before textmessage was sent.',
                ).to.be.undefined;

                // Create incoming text message
                const task = createNewIncomingTextMessageTask(services, user1, me);
                const expectations = [
                    NetworkExpectationFactory.startTransaction(42, TransactionScope.CONTACT_SYNC),
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.contactSync).not.to.be.undefined;
                        expect(payload.contactSync?.create).not.to.be.undefined;
                        expect(payload.contactSync?.create?.contact).not.to.be.undefined;
                        const newContact = unwrap(payload.contactSync?.create?.contact);
                        expect(newContact.identity).to.equal(user1.identity.string);
                    }),

                    // Reflect and ack incoming text message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                    }),
                    NetworkExpectationFactory.writeIncomingMessageAck(),

                    // Reflect and send delivery receipt
                    ...reflectAndSendDeliveryReceipt(
                        services,
                        user1,
                        CspE2eDeliveryReceiptStatus.RECEIVED,
                    ),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                // Get newly created contact
                const user1Contact = model.contacts.getByIdentity(user1.identity.string);
                expect(user1Contact, 'Contact user1 shoult exist after the textmessage was sent.')
                    .not.to.be.undefined;

                expect(expectations, 'Not all expectations consumed').to.be.empty;
            });
        });

        describe('text messages', function () {
            it('stores a text message from a known contact', async function () {
                const {model} = services;

                // Add contacts
                const user1Contact = addTestUserAsContact(model, user1);

                // Get user conversation
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });
                assert(conversation !== undefined, 'Conversation with user 1 not found');
                expect(conversation.get().controller.getAllMessages().get().size).to.equal(0);

                // Create incoming text message
                const messageText = 'this is the secret! message';
                const task = createNewIncomingTextMessageTask(services, user1, me, messageText);

                // Run task
                const handle = new TestHandle(services, [
                    // Reflect and ack incoming text message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        expect(incomingMessage.type).to.equal(
                            protobuf.common.CspE2eMessageType.TEXT,
                        );
                    }),
                    NetworkExpectationFactory.writeIncomingMessageAck(),

                    // Reflect and send delivery receipt
                    ...reflectAndSendDeliveryReceipt(
                        services,
                        user1,
                        CspE2eDeliveryReceiptStatus.RECEIVED,
                    ),
                ]);
                await task.run(handle);
                handle.finish();

                // Text message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.TEXT,
                    `Expected message type to be text, but was ${message.type}`,
                );
                expect(message.get().view.text).to.equal(messageText);
            });

            it('stores a text message from an unknown contact', async function () {
                const {model, directory} = services;

                addTestUserToFakeDirectory(directory, user1);

                // Create incoming text message
                const task = createNewIncomingTextMessageTask(services, user1, me);
                const handle = new TestHandle(services, [
                    // Contact creation
                    NetworkExpectationFactory.startTransaction(42, TransactionScope.CONTACT_SYNC),
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        const newContact = unwrap(payload.contactSync?.create?.contact);
                        expect(newContact.identity).to.equal(user1.identity.string);
                    }),

                    // Reflect and ack incoming text message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        expect(incomingMessage.type).to.equal(
                            protobuf.common.CspE2eMessageType.TEXT,
                        );
                    }),
                    NetworkExpectationFactory.writeIncomingMessageAck(),

                    // Reflect and send delivery receipt
                    ...reflectAndSendDeliveryReceipt(
                        services,
                        user1,
                        CspE2eDeliveryReceiptStatus.RECEIVED,
                    ),
                ]);
                await task.run(handle);
                handle.finish();

                // Get newly created contact
                const user1Contact = model.contacts.getByIdentity(user1.identity.string);
                expect(user1Contact, 'Contact user1 shoult exist after the textmessage was sent.')
                    .not.to.be.undefined;
                assert(user1Contact !== undefined);

                // Get user conversation
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });
                assert(conversation !== undefined, 'Conversation with user 1 not found');
                expect(
                    conversation.get().controller.getAllMessages().get().size,
                    'stored message set size',
                ).to.equal(1);

                // Text message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.TEXT,
                    `Expected message type to be text, but was ${message.type}`,
                );
            });
        });

        describe('file messages', function () {
            async function setupFileMessageTest(): Promise<{
                fileBlobId: BlobId;
                thumbnailBlobId: BlobId;
                encryptionKey: RawBlobKey;
                conversation: ModelStore<Conversation>;
            }> {
                const {blob, crypto, model} = services;

                // Add contacts
                const user1Contact = addTestUserAsContact(model, user1);

                // Get user conversation
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });
                assert(conversation !== undefined, 'Conversation with user 1 not found');
                expect(conversation.get().controller.getAllMessages().get().size).to.equal(0);

                // Register test blobs
                const encryptionKey = randomBlobKey();
                const encryptionSecretBox = crypto.getSecretBox(
                    encryptionKey,
                    NONCE_UNGUARDED_SCOPE,
                    undefined,
                );
                const plainFileBlobBytes = new Uint8Array([1, 2, 9, 8, 5, 5]) as PlainData;
                const plainThumbnailBlobBytes = new Uint8Array([9, 8, 9]) as PlainData;
                const encryptedFileBlobBytes = encryptionSecretBox
                    .encryptor(CREATE_BUFFER_TOKEN, plainFileBlobBytes)
                    .encryptWithDangerousUnguardedNonce(BLOB_FILE_NONCE);
                await blob.upload('public', encryptedFileBlobBytes);
                const encryptedThumbnailBlobBytes = encryptionSecretBox
                    .encryptor(CREATE_BUFFER_TOKEN, plainThumbnailBlobBytes)
                    .encryptWithDangerousUnguardedNonce(BLOB_THUMBNAIL_NONCE);
                const fileBlobId = await blob.upload('public', encryptedFileBlobBytes);
                const thumbnailBlobId = await blob.upload('public', encryptedThumbnailBlobBytes);

                return {
                    fileBlobId,
                    thumbnailBlobId,
                    encryptionKey,
                    conversation,
                };
            }

            function createFileBasedMessage(
                encryptionKey: RawBlobKey,
                fileBlobId: BlobId,
                thumbnailBlobId: BlobId | undefined,
                fileProperties: {
                    fileName: string;
                    fileMediaType: string;
                    thumbnailMediaType: string | undefined;
                    fileSizeBytes: u53;
                    renderingType: FileRenderingType;
                    metadata: Record<string, unknown>;
                },
            ): MessageWithMetadataBoxLike {
                const encryptionKeyHex = bytesToHex(encryptionKey.unwrap());
                let i, j;
                switch (fileProperties.renderingType) {
                    case 'file':
                        i = j = 0;
                        break;
                    case 'media':
                        i = j = 1;
                        break;
                    case 'sticker':
                        i = 1;
                        j = 2;
                        break;
                    default:
                        unreachable(fileProperties.renderingType);
                }
                return createMessage(
                    services,
                    user1,
                    me,
                    CspE2eConversationType.FILE,
                    structbuf.bridge.encoder(structbuf.csp.e2e.File, {
                        file: UTF8.encode(
                            JSON.stringify({
                                // Blob IDs
                                b: bytesToHex(fileBlobId),
                                ...(thumbnailBlobId === undefined
                                    ? {}
                                    : {
                                          t: bytesToHex(thumbnailBlobId),
                                      }),
                                // Encryption key
                                k: encryptionKeyHex,
                                // Media
                                m: fileProperties.fileMediaType,
                                p: fileProperties.thumbnailMediaType,
                                // Name
                                n: fileProperties.fileName,
                                // Size
                                s: fileProperties.fileSizeBytes,
                                // Correlation ID
                                c: '6c9e78d01f5235a7da752df188e48924',
                                // Metadata
                                x: fileProperties.metadata,
                                // Rendering type
                                i,
                                j,
                            }),
                        ),
                    }),
                    CspMessageFlags.fromPartial({sendPushNotification: true}),
                );
            }

            async function runIncomingFileMessageTask(
                fileMessage: MessageWithMetadataBoxLike,
            ): Promise<void> {
                const task = new IncomingMessageTask(services, fileMessage);
                const handle = new TestHandle(services, [
                    // Reflect and ack incoming file message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        expect(incomingMessage.type).to.equal(
                            protobuf.common.CspE2eMessageType.FILE,
                        );
                    }),
                    NetworkExpectationFactory.writeIncomingMessageAck(),

                    // Reflect and send delivery receipt
                    ...reflectAndSendDeliveryReceipt(
                        services,
                        user1,
                        CspE2eDeliveryReceiptStatus.RECEIVED,
                    ),
                ]);
                await task.run(handle);
                handle.finish();
            }

            it('stores a raw file message from a known contact', async function () {
                const {fileBlobId, thumbnailBlobId, encryptionKey, conversation} =
                    await setupFileMessageTest();

                // Create incoming file message
                const fileMediaType = 'application/pdf';
                const thumbnailMediaType = 'image/png';
                const fileName = 'document.pdf';
                const fileSizeBytes = 12342345;
                const fileMessage = createFileBasedMessage(
                    encryptionKey,
                    fileBlobId,
                    thumbnailBlobId,
                    {
                        fileMediaType,
                        thumbnailMediaType,
                        fileName,
                        fileSizeBytes,
                        renderingType: 'file',
                        metadata: {},
                    },
                );

                // Run task
                await runIncomingFileMessageTask(fileMessage);

                // File message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.FILE,
                    `Expected message type to be file, but was ${message.type}`,
                );
                const view = message.get().view;
                expect(view.blobId).to.deep.equal(fileBlobId);
                expect(view.thumbnailBlobId).to.deep.equal(thumbnailBlobId);
                expect(view.encryptionKey).to.deep.equal(encryptionKey);
                expect(view.mediaType).to.equal(fileMediaType);
                expect(view.thumbnailMediaType).to.equal(thumbnailMediaType);
                expect(view.fileName).to.equal(fileName);
                expect(view.fileSize).to.equal(fileSizeBytes);
            });

            async function imageMessageTest(
                animated: boolean,
                dimensions: Dimensions | undefined,
            ): Promise<void> {
                const {fileBlobId, thumbnailBlobId, encryptionKey, conversation} =
                    await setupFileMessageTest();

                // Create incoming image message
                const fileMediaType = 'image/jpeg';
                const thumbnailMediaType = 'image/png';
                const fileName = 'hello.jpg';
                const fileSizeBytes = 23523;
                const fileMessage = createFileBasedMessage(
                    encryptionKey,
                    fileBlobId,
                    thumbnailBlobId,
                    {
                        fileMediaType,
                        thumbnailMediaType,
                        fileName,
                        fileSizeBytes,
                        renderingType: 'media',
                        metadata: {
                            a: animated,
                            ...(dimensions === undefined
                                ? {}
                                : {
                                      w: dimensions.width,
                                      h: dimensions.height,
                                  }),
                        },
                    },
                );

                // Run task
                await runIncomingFileMessageTask(fileMessage);

                // Image message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.IMAGE,
                    `Expected message type to be image, but was ${message.type}`,
                );
                const view = message.get().view;
                expect(view.blobId).to.deep.equal(fileBlobId);
                expect(view.thumbnailBlobId).to.deep.equal(thumbnailBlobId);
                expect(view.encryptionKey).to.deep.equal(encryptionKey);
                expect(view.mediaType).to.equal(fileMediaType);
                expect(view.thumbnailMediaType).to.equal(thumbnailMediaType);
                expect(view.fileName).to.equal(fileName);
                expect(view.fileSize).to.equal(fileSizeBytes);
                expect(view.animated).to.equal(animated);
                expect(view.dimensions).to.deep.equal(dimensions);
            }

            for (const animated of [true, false]) {
                for (const dimensions of [{width: 123, height: 35}, undefined]) {
                    it(`stores an ${animated ? 'animated' : 'non-animated'} image message ${
                        dimensions === undefined ? 'without' : 'with'
                    } dimensions from a known contact`, async function () {
                        await imageMessageTest(animated, dimensions);
                    });
                }
            }

            async function videoMessageTest(
                duration: f64 | undefined,
                dimensions: Dimensions | undefined,
            ): Promise<void> {
                const {fileBlobId, thumbnailBlobId, encryptionKey, conversation} =
                    await setupFileMessageTest();

                // Create incoming video message
                const fileMediaType = 'video/mp4';
                const thumbnailMediaType = 'image/png';
                const fileName = 'hello.mp4';
                const fileSizeBytes = 23523;
                const fileMessage = createFileBasedMessage(
                    encryptionKey,
                    fileBlobId,
                    thumbnailBlobId,
                    {
                        fileMediaType,
                        thumbnailMediaType,
                        fileName,
                        fileSizeBytes,
                        renderingType: 'media',
                        metadata: {
                            d: duration,
                            ...(dimensions === undefined
                                ? {}
                                : {
                                      w: dimensions.width,
                                      h: dimensions.height,
                                  }),
                        },
                    },
                );

                // Run task
                await runIncomingFileMessageTask(fileMessage);

                // Video message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.VIDEO,
                    `Expected message type to be video, but was ${message.type}`,
                );
                const view = message.get().view;
                expect(view.blobId).to.deep.equal(fileBlobId);
                expect(view.thumbnailBlobId).to.deep.equal(thumbnailBlobId);
                expect(view.encryptionKey).to.deep.equal(encryptionKey);
                expect(view.mediaType).to.equal(fileMediaType);
                expect(view.thumbnailMediaType).to.equal(thumbnailMediaType);
                expect(view.fileName).to.equal(fileName);
                expect(view.fileSize).to.equal(fileSizeBytes);
                expect(view.duration).to.equal(duration);
                expect(view.dimensions).to.deep.equal(dimensions);
            }

            for (const duration of [0.123, undefined]) {
                for (const dimensions of [{width: 123, height: 35}, undefined]) {
                    it(`stores a video message ${
                        duration === undefined ? 'without' : 'with'
                    } duration and ${
                        dimensions === undefined ? 'without' : 'with'
                    } dimensions from a known contact`, async function () {
                        await videoMessageTest(duration, dimensions);
                    });
                }
            }

            async function audioMessageTest(duration: f64 | undefined): Promise<void> {
                const {fileBlobId, encryptionKey, conversation} = await setupFileMessageTest();

                // Create incoming audio message
                const fileMediaType = 'audio/x-m4a';
                const thumbnailMediaType = undefined;
                const fileName = 'recordAudio-2023-09-11_11-57-58.m4a';
                const fileSizeBytes = 23523;
                const fileMessage = createFileBasedMessage(encryptionKey, fileBlobId, undefined, {
                    fileMediaType,
                    thumbnailMediaType,
                    fileName,
                    fileSizeBytes,
                    renderingType: 'media',
                    metadata: {
                        d: duration,
                    },
                });

                // Run task
                await runIncomingFileMessageTask(fileMessage);

                // Audio message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = unwrap(messages[0]);
                assert(
                    message.type === MessageType.AUDIO,
                    `Expected message type to be audio, but was ${message.type}`,
                );
                const view = message.get().view;
                expect(view.blobId).to.deep.equal(fileBlobId);
                expect(view.thumbnailBlobId).to.equal(undefined);
                expect(view.encryptionKey).to.deep.equal(encryptionKey);
                expect(view.mediaType).to.equal(fileMediaType);
                expect(view.thumbnailMediaType).to.equal(undefined);
                expect(view.fileName).to.equal(fileName);
                expect(view.fileSize).to.equal(fileSizeBytes);
                expect(view.duration).to.equal(duration);
            }

            for (const duration of [0.123, undefined]) {
                it(`stores an audio message ${
                    duration === undefined ? 'without' : 'with'
                } duration from a known contact`, async function () {
                    await audioMessageTest(duration);
                });
            }
        });

        describe('group messages', () => {
            it('only accepts group text messages from members', async function () {
                const {model} = services;

                // Add contacts
                const contact1 = addTestUserAsContact(model, user1);
                addTestUserAsContact(model, user2);

                // Group created by user1
                const groupUid = makeGroup(model.db, {creatorUid: contact1.ctx});
                const group = unwrap(model.groups.getByUid(groupUid));
                const groupConversation = group.get().controller.conversation();
                group.get().controller.setMembers.direct([contact1], new Date());

                function makeGroupMessage(
                    sender: TestUser,
                    messageText: string,
                ): structbuf.csp.payload.MessageWithMetadataBoxLike {
                    return createMessage(
                        services,
                        sender,
                        me,
                        CspE2eGroupConversationType.GROUP_TEXT,
                        structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                            creatorIdentity: UTF8.encode(
                                getIdentityString(services.device, group.get().view.creator),
                            ),
                            groupId: group.get().view.groupId,
                            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                                text: UTF8.encode(messageText),
                            }),
                        }),
                        CspMessageFlags.none(),
                    );
                }

                // Conversation is empty
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(0);
                }

                // Process group message from user1 (member)
                {
                    const message = makeGroupMessage(user1, 'hello from user1');
                    const task = new IncomingMessageTask(services, message);
                    const expectations: NetworkExpectation[] = [
                        // We expect the message to be reflected
                        NetworkExpectationFactory.reflectSingle((payload) => {
                            expect(payload.incomingMessage).not.to.be.undefined;
                            expect(payload.incomingMessage?.senderIdentity).to.equal(
                                user1.identity.string,
                            );
                            expect(payload.incomingMessage?.type).to.equal(
                                CspE2eGroupConversationType.GROUP_TEXT,
                            );
                        }),

                        // Message is acked after processing
                        NetworkExpectationFactory.writeIncomingMessageAck(),
                    ];
                    const handle = new TestHandle(services, expectations);
                    await task.run(handle);
                    expect(expectations, 'Not all expectations consumed').to.be.empty;
                }

                // Text message should have been created
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(1);
                }

                // Process group message from user2 (non-member)
                {
                    const message = makeGroupMessage(user2, 'hello from user2');
                    const task = new IncomingMessageTask(services, message);
                    console.warn('A');
                    const expectations: NetworkExpectation[] = [
                        // We expect a group-sync-request to be reflected and sent
                        ...reflectAndSendGroupSyncRequest(services, user1),
                        // Message is acked after processing
                        NetworkExpectationFactory.writeIncomingMessageAck(),
                    ];
                    const handle = new TestHandle(services, expectations);
                    await task.run(handle);
                    expect(expectations, 'Not all expectations consumed').to.be.empty;
                    console.warn('B');
                }

                // Ensure that no additional text message was created
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(1);
                }
            });
        });

        describe('contact blocking', function () {
            it('creates no new contact and discards message if block unknown is active', async function () {
                const {model, directory} = services;

                addTestUserToFakeDirectory(directory, user1);

                // Set privacy to block unknown
                model.user.privacySettings.get().controller.update({
                    unknownContactPolicy: UnknownContactPolicy.BLOCK_UNKNOWN,
                });

                // Verify contact absence
                const user1ContactBefore = model.contacts.getByIdentity(user1.identity.string);
                expect(
                    user1ContactBefore,
                    'Contact user1 should not exist before textmessage was sent.',
                ).to.be.undefined;

                // Create incoming text message
                const task = createNewIncomingTextMessageTask(services, user1, me);
                const expectations = [NetworkExpectationFactory.writeIncomingMessageAck()];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                // Verify contact absence
                const user1ContactAfter = model.contacts.getByIdentity(user1.identity.string);
                expect(
                    user1ContactAfter,
                    'Contact user1 should not exist after textmessage was sent.',
                ).to.be.undefined;

                expect(expectations, 'Not all expectations consumed').to.be.empty;
            });

            it('discards group text message if member contact is blocked', async function () {
                const {model} = services;

                // Add contacts
                const contact1 = addTestUserAsContact(model, user1);
                const contact2 = addTestUserAsContact(model, user2);

                // Block user2
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [user2.identity.string]},
                });

                // Group created by user1
                const groupUid = makeGroup(model.db, {creatorUid: contact1.ctx}, [contact2.ctx]);
                const group = unwrap(model.groups.getByUid(groupUid));
                const groupConversation = group.get().controller.conversation();
                group.get().controller.setMembers.direct([contact1], new Date());

                function makeGroupMessage(
                    sender: TestUser,
                    messageText: string,
                ): structbuf.csp.payload.MessageWithMetadataBoxLike {
                    return createMessage(
                        services,
                        sender,
                        me,
                        CspE2eGroupConversationType.GROUP_TEXT,
                        structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                            creatorIdentity: UTF8.encode(
                                getIdentityString(services.device, group.get().view.creator),
                            ),
                            groupId: group.get().view.groupId,
                            innerData: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                                text: UTF8.encode(messageText),
                            }),
                        }),
                        CspMessageFlags.none(),
                    );
                }

                // Conversation is empty
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(0);
                }

                // Process group message from user1 (member)
                {
                    const message = makeGroupMessage(user1, 'hello from user1');
                    const task = new IncomingMessageTask(services, message);
                    const expectations: NetworkExpectation[] = [
                        // We expect the message to be reflected
                        NetworkExpectationFactory.reflectSingle((payload) => {
                            expect(payload.incomingMessage).not.to.be.undefined;
                            const incomingMessage = unwrap(payload.incomingMessage);
                            expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        }),
                        // Message is acked after processing
                        NetworkExpectationFactory.writeIncomingMessageAck(),
                    ];
                    const handle = new TestHandle(services, expectations);
                    await task.run(handle);
                    expect(expectations, 'Not all expectations consumed').to.be.empty;
                }

                // Text message should have been created
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(1);
                }

                // Process group message from user2 (blocked)
                {
                    const message = makeGroupMessage(user2, 'hello from user2');
                    const task = new IncomingMessageTask(services, message);
                    const expectations: NetworkExpectation[] = [
                        // Message is acked and dropped, since it comes from user2
                        NetworkExpectationFactory.writeIncomingMessageAck(),
                    ];
                    const handle = new TestHandle(services, expectations);
                    await task.run(handle);
                    expect(expectations, 'Not all expectations consumed').to.be.empty;
                }

                // Ensure that no additional text message was created
                {
                    const messages = groupConversation.get().controller.getAllMessages().get();
                    expect(messages.size).to.equal(1);
                }
            });

            it('processes group control messages if contact is blocked', async function () {
                const {crypto, model} = services;

                // Add creator contact
                const creator = user1;
                const creatorContact = addTestUserAsContact(model, creator);

                // Add group
                const groupId = randomGroupId(crypto);
                const group = addTestGroup(model, {
                    groupId,
                    creator: creatorContact,
                    name: 'AAA',
                    members: [creatorContact],
                });

                // Ensure that group name is AAA
                expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('AAA');

                // Block creator contact
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [creator.identity.string]},
                });

                // Prepare payload
                const container = {
                    groupId,
                    creatorIdentity: creator.identity.string,
                    innerData: new Uint8Array(0),
                };
                const name = {
                    name: 'BBB',
                };

                // Run task
                const task = new IncomingGroupNameTask(
                    services,
                    randomMessageId(crypto),
                    creatorContact,
                    container,
                    name,
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that group name was updated
                expect(model.groups.getByUid(group.ctx)?.get().view.name).to.equal('BBB');
            });

            it('discards 1:1 conversation text message if contact is blocked', async function () {
                const {model} = services;

                // Add contact and get conversation
                const user1Contact = addTestUserAsContact(model, user1);
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });
                assert(conversation !== undefined, 'Conversation with user 1 not found');
                expect(conversation.get().controller.getAllMessages().get().size).to.equal(0);

                // Block contact
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [user1.identity.string]},
                });

                // Create incoming text message
                const task = createNewIncomingTextMessageTask(services, user1, me);
                const expectations = [NetworkExpectationFactory.writeIncomingMessageAck()];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                // Text message should *not* be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(0);

                expect(expectations, 'Not all expectations consumed').to.be.empty;
            });
        });

        describe('edit message', function () {
            services = makeTestServices(me);

            services.persistentProtocolState;

            const {crypto, model} = services;
            const messageId = randomMessageId(crypto);

            const messageTask = createNewIncomingTextMessageTask(
                services,
                user1,
                me,
                'This is a secret message',
                messageId,
            );
            const messageExpectations: NetworkExpectation[] = [
                NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.incomingMessage).not.to.be.undefined;
                    const incomingMessage = unwrap(payload.incomingMessage);
                    expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                    expect(incomingMessage.type).to.equal(protobuf.common.CspE2eMessageType.TEXT);
                }),
                NetworkExpectationFactory.writeIncomingMessageAck(),

                // Send delivery receipt
                ...reflectAndSendDeliveryReceipt(
                    services,
                    user1,
                    CspE2eDeliveryReceiptStatus.RECEIVED,
                ),
            ];
            const messageHandle = new TestHandle(services, messageExpectations);
            const editHandle = new TestHandle(services, [
                NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.incomingMessage).not.to.be.undefined;
                    const incomingMessage = unwrap(payload.incomingMessage);
                    expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                    expect(incomingMessage.type).to.equal(
                        protobuf.common.CspE2eMessageType.EDIT_MESSAGE,
                    );
                }),
                NetworkExpectationFactory.writeIncomingMessageAck(),
            ]);

            const updateText = 'This secret message was edited';
            const editMessageTask = createNewEditMessageTask(
                services,
                user1,
                me,
                messageId,
                updateText,
            );

            const user1Contact = addTestUserAsContact(model, user1);

            it('receives a standard, correct edit message', async function () {
                await messageTask.run(messageHandle);

                await editMessageTask.run(editHandle);

                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });

                expect(conversation).to.not.equal(undefined, 'Conversation should exist');

                const updatedMessage = conversation?.get().controller.getMessage(messageId);

                assert(updatedMessage !== undefined, 'Message should not be undefined');

                expect(updatedMessage.get().view.lastEditedAt).to.not.equal(
                    undefined,
                    'The message should have a lastEditedAt flag',
                );

                const updatedMessageAsTextMessage = updatedMessage as AnyTextMessageModelStore;
                expect(updatedMessageAsTextMessage.get().view.text).to.equal(
                    'This secret message was edited',
                );
            });

            it('receives an edit message to a message that does not exist', async function () {
                const newMessageId = ensureMessageId(BigInt(messageId) + BigInt(1));
                const editMessageTask2 = createNewEditMessageTask(
                    services,
                    user1,
                    me,
                    newMessageId,
                );
                const editHandle2 = new TestHandle(services, [
                    NetworkExpectationFactory.writeIncomingMessageAck(),
                ]);
                await editMessageTask2.run(editHandle2);

                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });

                expect(conversation).to.not.equal(undefined, 'Conversation should exist');

                const updatedMessage = conversation?.get().controller.getMessage(newMessageId);

                expect(updatedMessage, 'No message wit this ID should exist').to.be.undefined;
            });
        });

        describe('delete message', function () {
            services = makeTestServices(me);

            const {crypto, model} = services;
            const messageId = randomMessageId(crypto);
            const user1Contact = addTestUserAsContact(model, user1);

            const messageTask = createNewIncomingTextMessageTask(
                services,
                user1,
                me,
                'This is a secret message',
                messageId,
            );
            const messageExpectations: NetworkExpectation[] = [
                NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.incomingMessage).not.to.be.undefined;
                    const incomingMessage = unwrap(payload.incomingMessage);
                    expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                    expect(incomingMessage.type).to.equal(protobuf.common.CspE2eMessageType.TEXT);
                }),
                NetworkExpectationFactory.writeIncomingMessageAck(),

                // Send delivery receipt
                ...reflectAndSendDeliveryReceipt(
                    services,
                    user1,
                    CspE2eDeliveryReceiptStatus.RECEIVED,
                ),
            ];

            const messageHandle = new TestHandle(services, messageExpectations);
            const deleteHandle = new TestHandle(services, [
                NetworkExpectationFactory.reflectSingle(() => {}),
                NetworkExpectationFactory.writeIncomingMessageAck(),
            ]);

            const deleteMessageTask = createNewDeleteMessageTask(services, user1, me, messageId);

            const secondMessageId = ensureMessageId(BigInt(messageId) + BigInt(8));

            const user3 = {
                identity: new Identity(ensureIdentityString('USER0003')),
                nickname: 'user3' as Nickname,
                ck: createClientKey(),
            };

            const user3Contact = addTestUserAsContact(model, user3);

            const messageTask3 = createNewIncomingTextMessageTask(
                services,
                user3,
                me,
                'This is a secret message',
                secondMessageId,
            );
            const messageExpectations3: NetworkExpectation[] = [
                NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.incomingMessage).not.to.be.undefined;
                    const incomingMessage = unwrap(payload.incomingMessage);
                    expect(incomingMessage.senderIdentity).to.equal(user3.identity.string);
                    expect(incomingMessage.type).to.equal(protobuf.common.CspE2eMessageType.TEXT);
                }),
                NetworkExpectationFactory.writeIncomingMessageAck(),

                // Send delivery receipt
                ...reflectAndSendDeliveryReceipt(
                    services,
                    user3,
                    CspE2eDeliveryReceiptStatus.RECEIVED,
                ),
            ];

            const messageHandle3 = new TestHandle(services, messageExpectations3);
            const editHandle3 = new TestHandle(services, [
                NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.incomingMessage).not.to.be.undefined;
                    const incomingMessage = unwrap(payload.incomingMessage);
                    expect(incomingMessage.senderIdentity).to.equal(user3.identity.string);
                    expect(incomingMessage.type).to.equal(
                        protobuf.common.CspE2eMessageType.EDIT_MESSAGE,
                    );
                }),
                NetworkExpectationFactory.writeIncomingMessageAck(),
            ]);

            const deleteMessageTask3 = createNewDeleteMessageTask(
                services,
                user3,
                me,
                secondMessageId,
            );

            const deleteHandle3 = new TestHandle(services, [
                NetworkExpectationFactory.reflectSingle(() => {}),
                NetworkExpectationFactory.writeIncomingMessageAck(),
            ]);

            const updateText = 'This secret message was edited';
            const editMessageTask3 = createNewEditMessageTask(
                services,
                user3,
                me,
                secondMessageId,
                updateText,
            );

            it('receives a standard, correct delete message', async function () {
                await messageTask.run(messageHandle);
                messageHandle.finish();

                await deleteMessageTask.run(deleteHandle);
                messageHandle.finish();

                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });

                expect(conversation).to.not.equal(undefined, 'Conversation should exist');

                const deletedMessage = conversation?.get().controller.getMessage(messageId);

                assert(deletedMessage !== undefined, 'Message should not be undefined');
                expect(deletedMessage.get().view.deletedAt).to.not.equal(
                    undefined,
                    'The message should have a deletedAt flag',
                );

                expect(deletedMessage.get().type).to.equal(MessageType.DELETED);
            });

            it('receives an edit on an already deleted message', async function () {
                const editMessageTask2 = createNewEditMessageTask(
                    services,
                    user1,
                    me,
                    messageId,
                    'bli bla blub',
                );

                const editHandle2 = new TestHandle(services, [
                    NetworkExpectationFactory.writeIncomingMessageAck(),
                ]);

                await editMessageTask2.run(editHandle2);
                editHandle2.finish();
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });

                const deletedMessage = conversation?.get().controller.getMessage(messageId);

                assert(deletedMessage !== undefined, 'Message should not be undefined');
                expect(deletedMessage.get().view.deletedAt).to.not.equal(
                    undefined,
                    'The message should have a deletedAt flag',
                );

                expect(deletedMessage.get().type).to.equal(MessageType.DELETED);
            });

            it('receives a delete on a message that does not exist', async function () {
                const newMessageId = ensureMessageId(BigInt(messageId) + BigInt(4));

                const deleteMessageTask2 = createNewDeleteMessageTask(
                    services,
                    user1,
                    me,
                    newMessageId,
                );

                const deleteHandle2 = new TestHandle(services, [
                    NetworkExpectationFactory.writeIncomingMessageAck(),
                ]);

                await deleteMessageTask2.run(deleteHandle2);
                deleteHandle2.finish();
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user1Contact.ctx,
                });

                const deletedMessage = conversation?.get().controller.getMessage(newMessageId);

                assert(deletedMessage === undefined, 'Message should not be defined');
            });

            it('receives a delete that makes version history disappear', async function () {
                await messageTask3.run(messageHandle3);

                messageHandle3.finish();

                await editMessageTask3.run(editHandle3);
                editHandle3.finish();
                const conversation = model.conversations.getForReceiver({
                    type: ReceiverType.CONTACT,
                    uid: user3Contact.ctx,
                });

                const editedMessage = conversation?.get().controller.getMessage(secondMessageId);

                expect(
                    editedMessage?.get().view.history.length,
                    'Version history must have two members',
                ).to.eql(2);

                await deleteMessageTask3.run(deleteHandle3);
                deleteHandle3.finish();

                const deletedMessage = conversation?.get().controller.getMessage(secondMessageId);

                expect(
                    deletedMessage?.get().view.history.length,
                    'Version history must be empty',
                ).to.eql(0);
            });
        });
    });
}
