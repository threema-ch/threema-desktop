import {expect} from 'chai';

import {NACL_CONSTANTS} from '~/common/crypto';
import type {DbGroupUid} from '~/common/db';
import {
    ConversationCategory,
    ConversationVisibility,
    CspE2eContactControlType,
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eMessageUpdateType,
    CspPayloadType,
    D2mPayloadType,
    GroupUserState,
} from '~/common/enum';
import type {Contact, Group, GroupController, GroupView} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {CspE2eType} from '~/common/network/protocol';
import {BLOB_ID_LENGTH, ensureBlobId} from '~/common/network/protocol/blob';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {OutgoingCspMessagesTask} from '~/common/network/protocol/task/csp/outgoing-csp-messages';
import type {
    MessageProperties,
    ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/types';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    ensureIdentityString,
    ensureMessageId,
    ensureNickname,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {wrapRawBlobKey, type ClientKey} from '~/common/network/types/keys';
import type {u53} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';
import {byteWithoutZeroPadding} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Delayed} from '~/common/utils/delayed';
import {Identity} from '~/common/utils/identity';
import {intoU64, intoUnsignedLong, unixTimestampToDateMs} from '~/common/utils/number';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';
import {
    addTestGroup,
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    type TestServices,
    type TestUser,
} from '~/test/mocha/common/backend-mocks';
import {
    decodeMessageEncodable,
    decryptContainer,
    decryptMetadata,
} from '~/test/mocha/common/network/protocol/task/task-test-helpers';

/**
 * Test {@link OutgoingCspMessageTask}
 */
export function run(): void {
    describe('OutgoingCspMessagesTask', function () {
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
        const gateway = {
            identity: new Identity(ensureIdentityString('*GATEWAY')),
            nickname: 'gateway' as Nickname,
            ck: createClientKey(),
        };

        // Set up services and log printing
        let services: TestServices;
        this.beforeEach(function () {
            services = makeTestServices(me);

            // Add a profile picture
            services.model.user.profileSettings.get().controller.update({
                profilePicture: {
                    blob: new Uint8Array([1, 2, 3, 4]),
                    blobId: ensureBlobId(new Uint8Array(BLOB_ID_LENGTH)),
                    key: wrapRawBlobKey(
                        services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                    ),
                    lastUploadedAt: new Date(),
                },
            });
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        function getExpectedD2dOutgoingReflectedMessageUpdateSent(): NetworkExpectation {
            return NetworkExpectationFactory.reflectSingle((payload) => {
                expect(payload.content).to.equal('outgoingMessageUpdate');
                const message = payload.outgoingMessageUpdate;
                assert(
                    message !== null && message !== undefined,
                    'payload.outgoingMessageUpdate is null or undefined',
                );
                expect(message.updates).to.have.length(1);
                const update = unwrap(message.updates[0]);
                expect(update.sent).not.to.be.undefined;
            });
        }

        function getExpectedCspMessagesForGroupMember(
            member: TestUser,
            messageId: MessageId,
            type: CspE2eType,
        ): NetworkExpectation[] {
            const messageIdDelayed = Delayed.simple<MessageId>('MessageId', messageId);
            return [
                NetworkExpectationFactory.write((m) => {
                    assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
                    assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);
                    const message = decodeMessageEncodable(m.payload.payload);
                    expect(message.senderIdentity).to.eql(UTF8.encode(me));

                    const receiverIdentityString = ensureIdentityString(
                        UTF8.decode(message.receiverIdentity),
                    );
                    expect(
                        receiverIdentityString,
                        'Receiver identity was not the intended receiver',
                    ).to.equal(member.identity.string);

                    const messageContainer = decryptContainer(
                        message,
                        services.device.csp.ck.public,
                        member.ck,
                    );
                    expect(messageContainer.type).to.equal(type);
                    expect(ensureMessageId(message.messageId)).to.equal(messageId);
                }),

                NetworkExpectationFactory.readIncomingMessageAck(
                    member.identity.string,
                    messageIdDelayed,
                ),
            ];
        }

        function checkProfilePicturePayload(
            payload: protobuf.d2d.Envelope,
            type:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
        ): void {
            expect(payload.content).to.equal('outgoingMessage');
            const profilePicturePayload = payload.outgoingMessage;
            assert(
                profilePicturePayload !== null && profilePicturePayload !== undefined,
                'payload.outgoingMessage is null or undefined',
            );
            expect(profilePicturePayload.type).to.equal(type);
        }

        function getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForGroup(
            numMembers: u53,
            messageProperties: {
                type: CspE2eType;
                messageId: MessageId;
                createdAt: Date;
            },
            profilePictureType:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
        ): NetworkExpectation {
            return NetworkExpectationFactory.reflect((payloads) => {
                expect(payloads).to.be.of.length(
                    numMembers + 1,
                    `Must reflect one message for the group message, and ${numMembers} profile picture messages}`,
                );
                const messagePayload = unwrap(payloads[0]);
                expect(messagePayload.content).to.equal('outgoingMessage');
                const message = messagePayload.outgoingMessage;
                assert(
                    message !== null && message !== undefined,
                    'payload.outgoingMessage is null or undefined',
                );
                const createdAt = unixTimestampToDateMs(intoU64(message.createdAt));
                expect(createdAt).to.eql(messageProperties.createdAt);
                expect(intoU64(message.messageId)).to.equal(messageProperties.messageId);
                expect(message.type).to.equal(messageProperties.type);

                let memberIdx = 1;
                for (; memberIdx <= numMembers; memberIdx++) {
                    const profilePictureMessagePayload = unwrap(payloads[memberIdx]);
                    checkProfilePicturePayload(profilePictureMessagePayload, profilePictureType);
                }
            });
        }

        /**
         * All of the messages are sent to the same receiver. The reciever is expected to receive
         * the profile picture as defined by its type.
         */
        function getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForMultipleMessagesWithSameReceiver(
            messagePropertiesArray: {
                type: CspE2eType;
                messageId: MessageId;
                createdAt: Date;
            }[],
            profilePictureType:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
        ): NetworkExpectation {
            return NetworkExpectationFactory.reflect((payloads) => {
                // One reflected message for every message, plus one additional one for the profile picture
                for (const [idx, messageProperties] of messagePropertiesArray.entries()) {
                    const messagePayload = unwrap(payloads[idx]);
                    expect(messagePayload.content).to.equal('outgoingMessage');
                    const message = messagePayload.outgoingMessage;
                    assert(
                        message !== null && message !== undefined,
                        'payload.outgoingMessage is null or undefined',
                    );
                    const createdAt = unixTimestampToDateMs(intoU64(message.createdAt));
                    expect(createdAt).to.eql(messageProperties.createdAt);
                    expect(intoU64(message.messageId)).to.equal(messageProperties.messageId);
                    expect(message.type).to.equal(messageProperties.type);
                }
                const profilePictureMessagePayload = unwrap(
                    payloads[messagePropertiesArray.length],
                );
                checkProfilePicturePayload(profilePictureMessagePayload, profilePictureType);
            });
        }

        /**
         * Every message is sent to a single receiver, and all of the receivers differ. All
         * receivers are expected to receive the profile picture message as defined by its type.
         */
        function getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForMultipleMessagesWithMultipleReceivers(
            messagePropertiesArray: {
                type: CspE2eType;
                messageId: MessageId;
                createdAt: Date;
            }[],
            profilePictureType:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
        ): NetworkExpectation {
            return NetworkExpectationFactory.reflect((payloads) => {
                // One reflected message for every message and one message for every receiver
                for (const [idx, messageProperties] of messagePropertiesArray.entries()) {
                    const messagePayload = unwrap(payloads[idx]);
                    expect(messagePayload.content).to.equal('outgoingMessage');
                    const message = messagePayload.outgoingMessage;
                    assert(
                        message !== null && message !== undefined,
                        'payload.outgoingMessage is null or undefined',
                    );
                    const createdAt = unixTimestampToDateMs(intoU64(message.createdAt));
                    expect(createdAt).to.eql(messageProperties.createdAt);
                    expect(intoU64(message.messageId)).to.equal(messageProperties.messageId);
                    expect(message.type).to.equal(messageProperties.type);
                }

                for (const [idx] of messagePropertiesArray.entries()) {
                    const profilePictureMessagePayload = unwrap(
                        payloads[messagePropertiesArray.length + idx],
                    );
                    checkProfilePicturePayload(profilePictureMessagePayload, profilePictureType);
                }
            });
        }

        /**
         * Expect a message and a profile picture message, as defined by its type.
         */
        function getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
            messageProperties: {
                type: CspE2eType;
                messageId: MessageId;
                createdAt: Date;
            },
            profilePictureType:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
        ): NetworkExpectation {
            return NetworkExpectationFactory.reflect((payloads) => {
                expect(payloads).to.be.of.length(2);
                const messagePayload = unwrap(payloads[0]);
                expect(messagePayload.content).to.equal('outgoingMessage');
                const message = messagePayload.outgoingMessage;
                assert(
                    message !== null && message !== undefined,
                    'payload.outgoingMessage is null or undefined',
                );
                const createdAt = unixTimestampToDateMs(intoU64(message.createdAt));
                expect(createdAt).to.eql(messageProperties.createdAt);
                expect(intoU64(message.messageId)).to.equal(messageProperties.messageId);
                expect(message.type).to.equal(messageProperties.type);

                const profilePictureMessagePayload = unwrap(payloads[1]);
                checkProfilePicturePayload(profilePictureMessagePayload, profilePictureType);
            });
        }

        function getExpectedD2dOutgoingReflectedMessage(messageProperties: {
            type: CspE2eType;
            messageId: MessageId;
            createdAt: Date;
        }): NetworkExpectation {
            return NetworkExpectationFactory.reflectSingle((payload) => {
                expect(payload.content).to.equal('outgoingMessage');
                const message = payload.outgoingMessage;
                assert(
                    message !== null && message !== undefined,
                    'payload.outgoingMessage is null or undefined',
                );
                const createdAt = unixTimestampToDateMs(intoU64(message.createdAt));
                expect(createdAt).to.eql(messageProperties.createdAt);
                expect(intoU64(message.messageId)).to.equal(messageProperties.messageId);
                expect(message.type).to.equal(messageProperties.type);
            });
        }

        function getExpectedCspOutgoingProfilePictureMessage(
            type:
                | CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE
                | CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
            ck: ClientKey,
            receiverIdentity: IdentityString,
        ): NetworkExpectation[] {
            return [
                NetworkExpectationFactory.write((m) => {
                    assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
                    assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);
                    const message = decodeMessageEncodable(m.payload.payload);

                    const messageContainer = decryptContainer(
                        message,
                        services.device.csp.ck.public,
                        ck,
                    );
                    expect(message.senderIdentity).to.deep.equal(UTF8.encode(me));
                    expect(messageContainer.type).to.eq(type);
                }),
                NetworkExpectationFactory.readIncomingMessageAckWithoutMessageId(
                    {crypto: services.crypto},
                    receiverIdentity,
                ),
            ];
        }

        function getExpectedD2dOutgoingReflectedMessageUpdate(
            creatorIdentity: IdentityString,
            groupId: GroupId,
        ): NetworkExpectation {
            return NetworkExpectationFactory.reflectSingle((payload) => {
                expect(payload.content).to.equal('outgoingMessageUpdate');
                const message = payload.outgoingMessageUpdate;
                assert(
                    message !== null && message !== undefined,
                    'payload.outgoingMessageUpdate is null or undefined',
                );
                expect(message.updates).to.have.length(1);
                const update = unwrap(message.updates[0]);
                expect(update.conversation?.group).not.to.be.undefined;
                expect(update.conversation?.group?.creatorIdentity).to.equal(creatorIdentity);
                expect(update.conversation?.group?.groupId).to.eql(intoUnsignedLong(groupId));
            });
        }

        async function runNicknameTest(
            receiver: typeof user1,
            distributeNickname: boolean,
            distributeProfilePicture: boolean,
            expectNickname: 'only-encrypted' | 'encrypted-and-legacy' | 'none',
        ): Promise<void> {
            const {crypto, device, model} = services;

            const receiverContact = addTestUserAsContact(model, receiver);

            services.model.user.profileSettings
                .get()
                .controller.update({nickname: ensureNickname('W00T')});
            const ownNickname = services.model.user.profileSettings.get().view.nickname;
            expect(ownNickname).not.to.be.empty;

            function makeProperties(
                messageId: MessageId,
            ): MessageProperties<structbuf.csp.e2e.TextEncodable, CspE2eConversationType.TEXT> {
                return {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags: CspMessageFlags.forMessageType('text'),
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: distributeNickname,
                };
            }

            const messageId = randomMessageId(crypto);
            const task = new OutgoingCspMessagesTask(services, [
                {receiver: receiverContact.get(), messageProperties: makeProperties(messageId)},
            ]);
            const messageIdDelayed = Delayed.simple<MessageId>('MessageId', messageId);
            const expectations: NetworkExpectation[] = [
                // First, the outgoing message must be reflected. Depending on the
                // `distributeProfilePictureFlag`, the profile picture needs to be reflected
                // consequently.
                !distributeProfilePicture
                    ? NetworkExpectationFactory.reflectSingle()
                    : NetworkExpectationFactory.reflect((payloads) => {
                          expect(payloads).to.be.of.length(2);
                      }),

                // Then, the actual outgoing message is sent via CSP.
                NetworkExpectationFactory.write((m) => {
                    assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
                    assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);
                    const message = decodeMessageEncodable(m.payload.payload);
                    const metadata = decryptMetadata(
                        services,
                        message,
                        device.csp.ck.public,
                        receiver.ck,
                    );
                    expect(message.senderIdentity).to.deep.equal(UTF8.encode(me));
                    const legacySenderNickname = UTF8.decode(
                        byteWithoutZeroPadding(message.legacySenderNickname),
                    );

                    if (
                        expectNickname === 'only-encrypted' ||
                        expectNickname === 'encrypted-and-legacy'
                    ) {
                        expect(metadata?.nickname).to.equal(ownNickname);
                    } else {
                        expect(metadata?.nickname).to.be.undefined;
                    }
                    if (expectNickname === 'encrypted-and-legacy') {
                        expect(legacySenderNickname).to.equal(ownNickname);
                    } else {
                        expect(legacySenderNickname).to.equal('');
                    }
                }),

                // Read ack
                NetworkExpectationFactory.readIncomingMessageAck(
                    receiver.identity.string,
                    messageIdDelayed,
                ),

                // Now, the profile picture message is sent via CSP
                ...(!distributeProfilePicture
                    ? []
                    : [
                          NetworkExpectationFactory.write((m) => {
                              assertD2mPayloadType(m.type, D2mPayloadType.PROXY);
                              assertCspPayloadType(m.payload.type, CspPayloadType.OUTGOING_MESSAGE);
                              const message = decodeMessageEncodable(m.payload.payload);

                              const messageContainer = decryptContainer(
                                  message,
                                  services.device.csp.ck.public,
                                  receiver.ck,
                              );
                              expect(message.senderIdentity).to.deep.equal(UTF8.encode(me));
                              expect(messageContainer.type).to.eq(
                                  CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                              );
                          }),

                          NetworkExpectationFactory.readIncomingMessageAckWithoutMessageId(
                              services,
                              receiver.identity.string,
                          ),
                      ]),
                // Reflect OutoingMessageUpdate.Sent
                getExpectedD2dOutgoingReflectedMessageUpdateSent(),
            ];
            const handle = new TestHandle(services, expectations);
            await task.run(handle);
            handle.finish();
        }

        describe('nickname is', function () {
            it('sent encrypted when user profile distribution is allowed and receiver is not a Gateway ID', async function () {
                await runNicknameTest(user1, true, true, 'only-encrypted');
            });
            it('sent (encrypted and legacy) when user profile distribution is allowed and receiver is a Gateway ID', async function () {
                await runNicknameTest(gateway, true, false, 'encrypted-and-legacy');
            });
            it('not sent when user profile distribution is not allowed', async function () {
                await runNicknameTest(user1, false, false, 'none');
                await runNicknameTest(gateway, false, false, 'none');
            });
        });

        describe('1:1 contact messaging', function () {
            it('should correctly send and reflect text messages', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);

                const cspMessageFlags = CspMessageFlags.forMessageType('text');
                const messageId = randomMessageId(crypto);
                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
                        messageProperties,
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });

            it('correctly sends and reflects an edit message', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);

                const cspMessageFlags = CspMessageFlags.forMessageType('text');
                const messageId = randomMessageId(crypto);
                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
                        messageProperties,
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                const newText = 'Hello Zueri';
                const encoder = protobuf.utils.encoder(protobuf.csp_e2e.EditMessage, {
                    text: newText,
                    messageId: intoUnsignedLong(messageId),
                });

                const editMessageProperties = {
                    type: CspE2eMessageUpdateType.EDIT_MESSAGE as ValidCspMessageTypeForReceiver<Contact>,
                    encoder,
                    cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
                    messageId: randomMessageId(crypto),
                    createdAt: new Date(),
                    allowUserProfileDistribution: false,
                };
                const editTask = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties: editMessageProperties},
                ]);

                // Run task
                const editExpectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(editMessageProperties),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        editMessageProperties.messageId,
                        editMessageProperties.type,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessage');
                        const message = payload.outgoingMessage;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(message.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];

                const editHandle = new TestHandle(services, editExpectations);
                await editTask.run(editHandle);
                handle.finish();
            });

            it('correctly sends and reflects a delete message', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);

                const cspMessageFlags = CspMessageFlags.forMessageType('text');
                const messageId = randomMessageId(crypto);
                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
                        messageProperties,
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();

                const encoder = protobuf.utils.encoder(protobuf.csp_e2e.DeleteMessage, {
                    messageId: intoUnsignedLong(messageId),
                });

                const deleteMessageProperties = {
                    type: CspE2eMessageUpdateType.DELETE_MESSAGE as ValidCspMessageTypeForReceiver<Contact>,
                    encoder,
                    cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
                    messageId: randomMessageId(crypto),
                    createdAt: new Date(),
                    allowUserProfileDistribution: false,
                };
                const deleteTask = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties: deleteMessageProperties},
                ]);

                // Run task
                const editExpectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(deleteMessageProperties),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        deleteMessageProperties.messageId,
                        deleteMessageProperties.type,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessage');
                        const message = payload.outgoingMessage;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(message.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];

                const deleteHandle = new TestHandle(services, editExpectations);
                await deleteTask.run(deleteHandle);
                handle.finish();
            });
        });

        interface GroupMessageTestParams {
            readonly name: string;
            readonly creator: TestUser | 'self';
            readonly members: TestUser[];
            readonly messageProperties?: Omit<
                MessageProperties<unknown, ValidCspMessageTypeForReceiver<Group>>,
                'messageId'
            >;
            readonly testExpectations?: (
                groupStore: ModelStore<Group, Readonly<GroupView>, GroupController, DbGroupUid, 2>,
                messageProperties: MessageProperties<
                    unknown,
                    ValidCspMessageTypeForReceiver<Group>
                >,
            ) => NetworkExpectation[];
        }

        async function runSendGroupMessageTest(params: GroupMessageTestParams): Promise<void> {
            const {crypto, model} = services;

            // Unpack params and set defaults
            const {name, creator, members} = params;
            const messageProperties = params.messageProperties ?? {
                type: CspE2eGroupConversationType.GROUP_TEXT,
                encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode('Hello World!'),
                }),
                cspMessageFlags: CspMessageFlags.forMessageType('text'),
                createdAt: new Date(),
                allowUserProfileDistribution: true,
            };
            const testExpectations = params.testExpectations ?? (() => []);

            // Add creator to contacts if necessary
            let creatorContact: ModelStore<Contact> | 'me' = 'me';
            if (creator !== 'self') {
                creatorContact = addTestUserAsContact(model, creator);
            }

            // Add group members to DB
            const memberStores = members.map((member) => addTestUserAsContact(model, member));

            // Create group in DB
            const groupId = randomGroupId(crypto);
            const groupStore = addTestGroup(model, {
                groupId,
                name,
                creator: creatorContact,
                createdAt: new Date(),
                userState: GroupUserState.MEMBER,
                members: memberStores,
            });

            // Create new OutgoingMessageTask
            const properties = {
                messageId: randomMessageId(crypto),
                ...messageProperties,
            } as const;
            const task = new OutgoingCspMessagesTask(services, [
                {receiver: groupStore.get(), messageProperties: properties},
            ]);

            // Run task
            const expectations = testExpectations(groupStore, properties);
            const handle = new TestHandle(services, expectations);
            await task.run(handle);
            handle.finish();
        }

        describe('group messaging', function () {
            it('should send a message to all group members', async function () {
                const members = [user1, user2];
                await runSendGroupMessageTest({
                    name: 'Chüngelizüchter Pfäffikon',
                    creator: 'self',
                    members,
                    testExpectations: (groupStore, messageProperties) => [
                        getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForGroup(
                            members.length,
                            messageProperties,
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        ),

                        ...getExpectedCspMessagesForGroupMember(
                            user1,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user1.ck,
                            user1.identity.string,
                        ),
                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user2.ck,
                            user2.identity.string,
                        ),

                        //  Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            me,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });

            it('should reflect a message to other devices even if the group has no members', async function () {
                await runSendGroupMessageTest({
                    name: 'Elefantestreichler Rapperswil',
                    creator: 'self',
                    members: [],
                    testExpectations: (groupStore, messageProperties) => [
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),
                        //  Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            me,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });

            it('should also send a message to the creator, if it is not us', async function () {
                await runSendGroupMessageTest({
                    name: 'Chrüütlisammler Altendorf',
                    creator: user1,
                    members: [user2],
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForGroup(
                            2,
                            messageProperties,
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        ),

                        // Note: This expects that the messages were sent in a synchronous manner in
                        // the order of the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                        ...getExpectedCspMessagesForGroupMember(
                            user1,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user2.ck,
                            user2.identity.string,
                        ),
                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user1.ck,
                            user1.identity.string,
                        ),

                        // Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            user1.identity.string,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });
        });

        describe('gateway group messaging', function () {
            it('should send text messages to the group creator if: creator is not a Gateway ID', async function () {
                await runSendGroupMessageTest({
                    name: '☁️ Wolkejäger Freienbach',
                    creator: user1,
                    members: [user2],
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForGroup(
                            2,
                            messageProperties,
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        ),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                        ...getExpectedCspMessagesForGroupMember(
                            user1,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user2.ck,
                            user2.identity.string,
                        ),
                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user1.ck,
                            user1.identity.string,
                        ),

                        // Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            user1.identity.string,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });

            it('should send text messages to the group creator if: creator is a Gateway ID and group name starts with ☁️', async function () {
                await runSendGroupMessageTest({
                    name: '☁️ Wasserskifahrer Lachen',
                    creator: gateway,
                    members: [user2],
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected. No profile picture will be
                        // sent to gateway. Therefore, only one profile picture message is to be
                        // expected.
                        getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
                            messageProperties,
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        ),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspMessagesForGroupMember(
                            gateway,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user2.ck,
                            user2.identity.string,
                        ),

                        // Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            gateway.identity.string,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });

            it("should not send text messages to the group creator if: creator is a Gateway ID and group name doesn't start with ☁️", async function () {
                await runSendGroupMessageTest({
                    name: 'Sunneaabäter Rapperswil',
                    creator: gateway,
                    members: [user2],
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected. No profile picture will be
                        // sent to gateway. Therefore, only one profile picture message is to be
                        // expected.
                        getExpectedD2dOutgoingReflectedMessagesWithProfilePicture(
                            messageProperties,
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        ),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspOutgoingProfilePictureMessage(
                            CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                            user2.ck,
                            user2.identity.string,
                        ),

                        // Finally, an OutgoingMessageUpdate.Sent is reflected.
                        getExpectedD2dOutgoingReflectedMessageUpdate(
                            gateway.identity.string,
                            groupStore.get().view.groupId,
                        ),
                    ],
                });
            });

            it('should send group leave messages to gateway group creators', async function () {
                await runSendGroupMessageTest({
                    name: 'Hornusser Vorderthal',
                    creator: gateway,
                    members: [user2],
                    messageProperties: {
                        type: CspE2eGroupControlType.GROUP_LEAVE,
                        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupLeave, {}),
                        cspMessageFlags: CspMessageFlags.none(),
                        createdAt: new Date(),
                        allowUserProfileDistribution: false,
                    },
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),

                        ...getExpectedCspMessagesForGroupMember(
                            gateway,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                    ],
                });
            });
        });

        describe('contact blocking', function () {
            it('should not send 1:1 conversation messages to blocked contacts', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);

                // Block user2
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [user1.identity.string]},
                });

                const cspMessageFlags = CspMessageFlags.forMessageType('text');

                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId: randomMessageId(crypto),
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected. There is no exception
                    // for blocked contacts here specified by the protocol.
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });

            it('should not send group conversation messages to blocked contacts', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);
                const user2store = addTestUserAsContact(model, user2);

                // Block user2
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [user2.identity.string]},
                });

                const groupId = randomGroupId(crypto);
                const group = model.groups.add.direct(
                    {
                        groupId,
                        creator: 'me',
                        createdAt: new Date(),
                        name: 'Chüngelizüchter Pfäffikon',
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                        colorIndex: 0,
                    },
                    [user1store, user2store],
                );

                const cspMessageFlags = CspMessageFlags.forMessageType('text');

                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eGroupConversationType.GROUP_TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId: randomMessageId(crypto),
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: group.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForGroup(
                        1,
                        messageProperties,
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    // Reflect a message to every member and wait for the ack.
                    //
                    // Note: This expects that the messages are sent in the same order as the group
                    //       members in the database
                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    getExpectedD2dOutgoingReflectedMessageUpdate(me, groupId),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });

            it('should send group control messages to blocked contacts', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);
                const user2store = addTestUserAsContact(model, user2);

                // Block user2
                model.user.privacySettings.get().controller.update({
                    blockedIdentities: {identities: [user2.identity.string]},
                });

                const groupId = randomGroupId(crypto);
                const group = model.groups.add.direct(
                    {
                        groupId,
                        creator: 'me',
                        createdAt: new Date(),
                        name: 'Chüngelizüchter Pfäffikon 🐇',
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                        colorIndex: 0,
                    },
                    [user1store, user2store],
                );

                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eGroupControlType.GROUP_NAME,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupCreatorContainer, {
                        groupId,
                        innerData: structbuf.bridge.encoder(structbuf.csp.e2e.GroupName, {
                            name: UTF8.encode('Chüngel- und Hoppelhasenzüchter Pfäffikon'),
                        }),
                    }),
                    cspMessageFlags: CspMessageFlags.none(),
                    messageId: randomMessageId(crypto),
                    createdAt: new Date(),
                    allowUserProfileDistribution: false,
                } as const;
                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: group.get(), messageProperties},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    // Reflect a message to every member and wait for the ack.
                    //
                    // Note: This expects that the messages are sent in the same order as the group
                    //       members in the database
                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),
                    ...getExpectedCspMessagesForGroupMember(
                        user2,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });
        });

        describe('bundled sending', function () {
            it('send multiple messages with user profile distribution to the same user', async function () {
                const user1store = addTestUserAsContact(services.model, user1);

                const cspMessageFlags = CspMessageFlags.forMessageType('text');
                const messageId = randomMessageId(services.crypto);
                const messageId2 = randomMessageId(services.crypto);
                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;

                const messageProperties2 = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Goodbye world!'),
                    }),
                    cspMessageFlags,
                    messageId: messageId2,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;

                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                    {receiver: user1store.get(), messageProperties: messageProperties2},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForMultipleMessagesWithSameReceiver(
                        [messageProperties, messageProperties2],
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties2.messageId,
                        messageProperties2.type,
                    ),

                    // Only send one profile picture because it should be cached
                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),
                    // Finally, an OutgoingMessageUpdate.Sent is reflected for both messages
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),

                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties2.messageId,
                        );
                    }),
                ];

                const handle = new TestHandle(services, expectations);

                await task.run(handle);
            });

            it('send multiple messages with user profile distribution to different users', async function () {
                const user1store = addTestUserAsContact(services.model, user1);
                const user2store = addTestUserAsContact(services.model, user2);

                const cspMessageFlags = CspMessageFlags.forMessageType('text');
                const messageId = randomMessageId(services.crypto);
                const messageId2 = randomMessageId(services.crypto);
                // Create new OutgoingMessageTask
                const messageProperties = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Hello World!'),
                    }),
                    cspMessageFlags,
                    messageId,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;

                const messageProperties2 = {
                    type: CspE2eConversationType.TEXT,
                    encoder: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                        text: UTF8.encode('Goodbye world!'),
                    }),
                    cspMessageFlags,
                    messageId: messageId2,
                    createdAt: new Date(),
                    allowUserProfileDistribution: true,
                } as const;

                const task = new OutgoingCspMessagesTask(services, [
                    {receiver: user1store.get(), messageProperties},
                    {receiver: user2store.get(), messageProperties: messageProperties2},
                ]);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessagesWithProfilePictureForMultipleMessagesWithMultipleReceivers(
                        [messageProperties, messageProperties2],
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
                    ),

                    ...getExpectedCspMessagesForGroupMember(
                        user2,
                        messageProperties2.messageId,
                        messageProperties2.type,
                    ),

                    // Send profile picture to both users
                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user1.ck,
                        user1.identity.string,
                    ),

                    ...getExpectedCspOutgoingProfilePictureMessage(
                        CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE,
                        user2.ck,
                        user2.identity.string,
                    ),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected for both messages
                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user1.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),

                    NetworkExpectationFactory.reflectSingle((payload) => {
                        expect(payload.content).to.equal('outgoingMessageUpdate');
                        const message = payload.outgoingMessageUpdate;
                        assert(
                            message !== null && message !== undefined,
                            'payload.outgoingMessageUpdate is null or undefined',
                        );
                        expect(message.updates).to.have.length(1);
                        const update = unwrap(message.updates[0]);
                        expect(update.conversation?.contact).to.equal(user2.identity.string);
                        expect(ensureMessageId(intoU64(update.messageId))).to.equal(
                            messageProperties2.messageId,
                        );
                    }),
                ];

                const handle = new TestHandle(services, expectations);

                await task.run(handle);
            });
        });
    });
}
