import {expect} from 'chai';

import {type ServicesForBackend} from '~/common/backend';
import {NACL_CONSTANTS, NONCE_UNGUARDED_TOKEN, type PlainData, wrapRawKey} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN, SharedBoxFactory} from '~/common/crypto/box';
import {
    CspE2eConversationType,
    CspE2eDeliveryReceiptStatus,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import {d2d} from '~/common/network/protobuf';
import {
    BLOB_FILE_NONCE,
    BLOB_THUMBNAIL_NONCE,
    MESSAGE_DATA_PADDING_LENGTH_MIN,
} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {IncomingMessageTask} from '~/common/network/protocol/task/csp/incoming-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {pkcs7PaddedEncoder} from '~/common/network/structbuf/bridge';
import {type LegacyMessageLike} from '~/common/network/structbuf/csp/payload';
import {ensureIdentityString, type IdentityString, type Nickname} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import {type ByteLengthEncoder, type u8} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {dateToUnixTimestampS} from '~/common/utils/number';
import {
    addTestUserAsContact,
    makeClientKey,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';
import {makeGroup} from '~/test/mocha/common/db-backend-tests';
import {reflectAndSendDeliveryReceipt} from '~/test/mocha/common/network/protocol/task/task-test-helpers';

/**
 * Create a message from {@link sender} to {@link receiver} and with the {@link innerPayload} used
 * as the inner payload of the legacy message.
 */
function createMessage(
    services: ServicesForBackend,
    sender: TestUser,
    receiver: IdentityString,
    type: u8,
    innerPayload: ByteLengthEncoder,
    flags: CspMessageFlags,
): structbuf.csp.payload.LegacyMessageLike {
    const {crypto, device} = services;
    const sharedBox = device.csp.ck.getSharedBox(sender.ck.public, device.csp.nonceGuard);
    const [messageNonce, messageBox] = sharedBox
        .encryptor(
            CREATE_BUFFER_TOKEN,
            structbuf.bridge.encoder(structbuf.csp.e2e.Container, {
                type,
                paddedData: pkcs7PaddedEncoder(
                    crypto,
                    MESSAGE_DATA_PADDING_LENGTH_MIN,
                    innerPayload,
                ),
            }),
        )
        .encryptWithRandomNonce();
    return {
        senderIdentity: sender.identity.bytes,
        receiverIdentity: UTF8.encode(receiver),
        messageId: randomMessageId(crypto),
        createdAt: dateToUnixTimestampS(new Date()),
        flags: flags.toBitmask(),
        reserved: 0,
        reservedMetadataLength: new Uint8Array(2),
        senderNickname: UTF8.encode(sender.nickname ?? ''),
        messageNonce,
        messageBox,
    };
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
            ck: makeClientKey(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
            ck: makeClientKey(),
        };

        // Set up services and log printing
        let services: TestServices;
        this.beforeEach(function () {
            services = makeTestServices(me);
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
                const {crypto, model} = services;

                // Encode and encrypt message
                const msg = createMessage(
                    services,
                    {
                        identity: new Identity(me),
                        ck: new SharedBoxFactory(
                            crypto,
                            wrapRawKey(
                                Uint8Array.from(services.rawClientKeyBytes),
                                NACL_CONSTANTS.KEY_LENGTH,
                            ).asReadonly(),
                        ),
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
                const task = new IncomingMessageTask(services, msg);
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
                const messageText = 'this is the secret message';
                const textMessage = createMessage(
                    services,
                    {
                        identity: user1.identity,
                        ck: user1.ck,
                        nickname: 'some user' as Nickname,
                    },
                    me,
                    CspE2eConversationType.TEXT,
                    structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode(messageText),
                    }),
                    CspMessageFlags.fromPartial({sendPushNotification: true}),
                );

                // Run task
                const task = new IncomingMessageTask(services, textMessage);
                const handle = new TestHandle(services, [
                    // Reflect and ack incoming text message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        expect(incomingMessage.type).to.equal(d2d.MessageType.TEXT);
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
                const message = messages[0];
                assert(
                    message.type === MessageType.TEXT,
                    `Expected message type to be text, but was ${message.type}`,
                );
                expect(message.get().view.text).to.equal(messageText);
            });
        });

        describe('file messages', function () {
            it('stores a raw file message from a known contact', async function () {
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
                const encryptionKey = wrapRawBlobKey(
                    crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                );
                const encryptionSecretBox = crypto.getSecretBox(
                    encryptionKey,
                    NONCE_UNGUARDED_TOKEN,
                );
                const plainFileBlobBytes = new Uint8Array([1, 2, 9, 8, 5, 5]) as PlainData;
                const plainThumbnailBlobBytes = new Uint8Array([9, 8, 9]) as PlainData;
                const encryptedFileBlobBytes = encryptionSecretBox
                    .encryptor(CREATE_BUFFER_TOKEN, plainFileBlobBytes)
                    .encryptWithNonce(BLOB_FILE_NONCE);
                await blob.upload('public', encryptedFileBlobBytes);
                const encryptedThumbnailBlobBytes = encryptionSecretBox
                    .encryptor(CREATE_BUFFER_TOKEN, plainThumbnailBlobBytes)
                    .encryptWithNonce(BLOB_THUMBNAIL_NONCE);
                const fileBlobId = await blob.upload('public', encryptedFileBlobBytes);
                const thumbnailBlobId = await blob.upload('public', encryptedThumbnailBlobBytes);

                // Create incoming file message
                const encryptionKeyHex = bytesToHex(encryptionKey.unwrap());
                const fileMediaType = 'application/pdf';
                const thumbnailMediaType = 'image/png';
                const fileName = 'document.pdf';
                const fileSizeBytes = 12342345;
                const fileMessage = createMessage(
                    services,
                    {
                        identity: user1.identity,
                        ck: user1.ck,
                        nickname: 'some user' as Nickname,
                    },
                    me,
                    CspE2eConversationType.FILE,
                    structbuf.bridge.encoder(structbuf.csp.e2e.File, {
                        file: UTF8.encode(
                            JSON.stringify({
                                // Blob IDs
                                b: bytesToHex(fileBlobId),
                                t: bytesToHex(thumbnailBlobId),
                                // Encryption key
                                k: encryptionKeyHex,
                                // Media
                                m: fileMediaType,
                                p: thumbnailMediaType,
                                // Name
                                n: fileName,
                                // Size
                                s: fileSizeBytes,
                                // Correlation ID
                                c: '6c9e78d01f5235a7da752df188e48924',
                                // Metadata
                                x: {},
                                // Rendering type
                                i: 0,
                                j: 0,
                            }),
                        ),
                    }),
                    CspMessageFlags.fromPartial({sendPushNotification: true}),
                );

                // Run task
                const task = new IncomingMessageTask(services, fileMessage);
                const handle = new TestHandle(services, [
                    // Reflect and ack incoming file message
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.incomingMessage).not.to.be.undefined;
                        const incomingMessage = unwrap(payload.incomingMessage);
                        expect(incomingMessage.senderIdentity).to.equal(user1.identity.string);
                        expect(incomingMessage.type).to.equal(d2d.MessageType.FILE);
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

                // File message should be part of the 1:1 conversation
                const messages = [...conversation.get().controller.getAllMessages().get()];
                expect(messages.length).to.equal(1);
                const message = messages[0];
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
                // TODO(DESK-247): Test rendering type
            });
        });

        describe('group messages', () => {
            it('only accepts group text messages from members', async function () {
                const {model} = services;

                // Add contacts
                const contact1 = addTestUserAsContact(model, user1);
                addTestUserAsContact(model, user2);

                // Group created by user1
                const groupUid = makeGroup(model.db, {creatorIdentity: user1.identity.string});
                const group = unwrap(model.groups.getByUid(groupUid));
                const groupConversation = group.get().controller.conversation();
                group.get().controller.members.set.fromSync([contact1.ctx]);

                function makeGroupMessage(
                    sender: TestUser,
                    messageText: string,
                ): LegacyMessageLike {
                    return createMessage(
                        services,
                        {
                            identity: sender.identity,
                            ck: sender.ck,
                            nickname: 'some user' as Nickname,
                        },
                        me,
                        CspE2eGroupConversationType.GROUP_TEXT,
                        structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                            creatorIdentity: UTF8.encode(group.get().view.creatorIdentity),
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

                // Process group message from user2 (non-member)
                {
                    const message = makeGroupMessage(user2, 'hello from user2');
                    const task = new IncomingMessageTask(services, message);
                    const expectations: NetworkExpectation[] = [
                        // Message is acked and dropped, since it's invalid
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
        });
    });
}
