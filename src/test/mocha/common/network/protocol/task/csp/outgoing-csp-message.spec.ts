import {expect} from 'chai';

import {
    ConversationCategory,
    ConversationVisibility,
    CspE2eConversationType,
    CspE2eGroupConversationType,
    CspPayloadType,
    D2mPayloadType,
    GroupUserState,
} from '~/common/enum';
import {type CspE2eType} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type MessageProperties,
    OutgoingCspMessageTask,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    ensureIdentityString,
    ensureMessageId,
    type GroupId,
    type IdentityString,
    type MessageId,
    type Nickname,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {byteWithoutZeroPadding} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';
import {Delayed} from '~/common/utils/delayed';
import {Identity} from '~/common/utils/identity';
import {intoU64, intoUnsignedLong, unixTimestampToDateMs} from '~/common/utils/number';
import {assertCspPayloadType, assertD2mPayloadType} from '~/test/mocha/common/assertions';
import {
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    type TestServices,
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
    describe('OutgoingCspMessageTask', function () {
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
                expect(message.updates[0].sent).not.to.be.undefined;
            });
        }

        async function runNicknameTest(
            receiver: typeof user1,
            allowUserProfileDistribution: boolean,
            expectNickname: 'only-encrypted' | 'encrypted-and-legacy' | 'none',
        ): Promise<void> {
            const {crypto, device, model} = services;

            const receiverContact = addTestUserAsContact(model, receiver);

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
                    allowUserProfileDistribution,
                };
            }

            const messageId = randomMessageId(crypto);
            const task = new OutgoingCspMessageTask(
                services,
                receiverContact.get(),
                makeProperties(messageId),
            );
            const messageIdDelayed = Delayed.simple<MessageId>(
                'Message ID not yet ready',
                'Message ID already set',
                messageId,
            );
            const expectations: NetworkExpectation[] = [
                // First, the outgoing message must be reflected
                NetworkExpectationFactory.reflectSingle(),

                // Then the message is sent via CSP
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
                    expect(message.senderIdentity).to.eql(UTF8.encode(me));
                    const legacySenderNickname = UTF8.decode(
                        byteWithoutZeroPadding(message.legacySenderNickname),
                    );

                    if (
                        expectNickname === 'only-encrypted' ||
                        expectNickname === 'encrypted-and-legacy'
                    ) {
                        expect(metadata?.nickname).to.equal(ownNickname);
                    } else {
                        expect(metadata?.nickname).to.equal('');
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

                // Reflect OutoingMessageUpdate.Sent
                getExpectedD2dOutgoingReflectedMessageUpdateSent(),
            ];
            const handle = new TestHandle(services, expectations);
            await task.run(handle);
            handle.finish();
        }

        describe('nickname is', function () {
            it('sent encrypted when user profile distribution is allowed and receiver is not a Gateway ID', async function () {
                await runNicknameTest(user1, true, 'only-encrypted');
            });
            it('sent (encrypted and legacy) when user profile distribution is allowed and receiver is a Gateway ID', async function () {
                await runNicknameTest(gateway, true, 'encrypted-and-legacy');
            });
            it('not sent when user profile distribution is not allowed', async function () {
                await runNicknameTest(user1, false, 'none');
                await runNicknameTest(gateway, false, 'none');
            });
        });

        describe('group messaging', function () {
            function getExpectedCspMessagesForGroupMember(
                member: typeof user1,
                messageId: MessageId,
            ): NetworkExpectation[] {
                const messageIdDelayed = Delayed.simple<MessageId>(
                    'Message ID not yet ready',
                    'Message ID already set',
                    messageId,
                );
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
                        expect(messageContainer.type).to.equal(
                            CspE2eGroupConversationType.GROUP_TEXT,
                        );
                        expect(ensureMessageId(message.messageId)).to.equal(messageId);
                    }),

                    NetworkExpectationFactory.readIncomingMessageAck(
                        member.identity.string,
                        messageIdDelayed,
                    ),
                ];
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
                    expect(message.updates[0].conversation?.group).not.to.be.undefined;
                    expect(message.updates[0].conversation?.group?.creatorIdentity).to.equal(
                        creatorIdentity,
                    );
                    expect(message.updates[0].conversation?.group?.groupId).to.eql(
                        intoUnsignedLong(groupId),
                    );
                });
            }

            it('should send a message to all group members', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);
                const user2store = addTestUserAsContact(model, user2);

                const groupId = randomGroupId(crypto);
                const group = model.groups.add.fromSync(
                    {
                        groupId,
                        creatorIdentity: me,
                        createdAt: new Date(),
                        name: 'Chüngelizüchter Pfäffikon',
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                        colorIndex: 0,
                    },
                    [user1store.ctx, user2store.ctx],
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
                const task = new OutgoingCspMessageTask(services, group.get(), messageProperties);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    // Reflect a message to every member and wait for the ack.
                    //
                    // Note: This expects that the were sent in a synchronous manner in the order of
                    //       the users in the database.
                    ...getExpectedCspMessagesForGroupMember(user1, messageProperties.messageId),
                    ...getExpectedCspMessagesForGroupMember(user2, messageProperties.messageId),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    getExpectedD2dOutgoingReflectedMessageUpdate(me, groupId),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });

            it('should also send a message to the creator, if it is not us', async function () {
                const {crypto, model} = services;

                addTestUserAsContact(model, user1);
                const user2store = addTestUserAsContact(model, user2);

                const groupId = randomGroupId(crypto);
                const group = model.groups.add.fromSync(
                    {
                        groupId,
                        creatorIdentity: user1.identity.string,
                        createdAt: new Date(),
                        name: 'Chüngelizüchter Pfäffikon',
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                        colorIndex: 0,
                    },
                    [user2store.ctx],
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
                const task = new OutgoingCspMessageTask(services, group.get(), messageProperties);

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    // Note: This expects that the were sent in a synchronous manner in the order of
                    // the users in the database.
                    ...getExpectedCspMessagesForGroupMember(user1, messageProperties.messageId),
                    ...getExpectedCspMessagesForGroupMember(user2, messageProperties.messageId),

                    // Finally, an OutgoingMessageUpdate.Sent is reflected
                    getExpectedD2dOutgoingReflectedMessageUpdate(user1.identity.string, groupId),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            });
        });
    });
}
