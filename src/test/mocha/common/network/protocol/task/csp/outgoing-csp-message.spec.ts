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
import {type TextEncodable} from '~/common/network/structbuf/csp/e2e';
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
    makeKeypair,
    makeTestServices,
    type NetworkExpectation,
    NetworkExpectationFactory,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {
    decodeLegacyMessageEncodable,
    decryptContainer,
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
            keypair: makeKeypair(),
        };
        const user2 = {
            identity: new Identity(ensureIdentityString('USER0002')),
            nickname: 'user2' as Nickname,
            keypair: makeKeypair(),
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
                const msg = payload.outgoingMessageUpdate;
                assert(
                    msg !== null && msg !== undefined,
                    'payload.outgoingMessageUpdate is null or undefined',
                );
                expect(msg.updates).to.have.length(1);
                expect(msg.updates[0].sent).not.to.be.undefined;
            });
        }

        it('nickname is only sent if allowUserProfileDistribution is set', async function () {
            const {crypto, model} = services;

            const user1store = addTestUserAsContact(model, user1);

            const ownNickname = services.model.user.profileSettings.get().view.nickname;
            expect(ownNickname).not.to.be.empty;

            function makeProperties(
                messageId: MessageId,
                allowUserProfileDistribution: boolean,
            ): MessageProperties<TextEncodable, CspE2eConversationType.TEXT> {
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

            for (const sendNickname of [true, false]) {
                const messageId = randomMessageId(crypto);
                const task = new OutgoingCspMessageTask(
                    services,
                    user1store.get(),
                    makeProperties(messageId, sendNickname),
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
                        const message = decodeLegacyMessageEncodable(m.payload.payload);
                        expect(message.senderIdentity).to.eql(UTF8.encode(me));
                        const senderNickname = UTF8.decode(
                            byteWithoutZeroPadding(message.senderNickname),
                        );
                        if (sendNickname) {
                            expect(senderNickname).to.equal(ownNickname);
                        } else {
                            expect(senderNickname).to.equal('');
                        }
                    }),

                    // Read ack
                    NetworkExpectationFactory.readIncomingMessageAck(
                        user1.identity.string,
                        messageIdDelayed,
                    ),

                    // Reflect OutoingMessageUpdate.Sent
                    getExpectedD2dOutgoingReflectedMessageUpdateSent(),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
                handle.finish();
            }
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
                        const message = decodeLegacyMessageEncodable(m.payload.payload);
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
                            member.keypair,
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
                    const msg = payload.outgoingMessage;
                    assert(
                        msg !== null && msg !== undefined,
                        'payload.outgoingMessage is null or undefined',
                    );
                    const createdAt = unixTimestampToDateMs(intoU64(msg.createdAt));
                    expect(createdAt).to.eql(messageProperties.createdAt);
                    expect(intoU64(msg.messageId)).to.equal(messageProperties.messageId);
                    expect(msg.type).to.equal(messageProperties.type);
                });
            }

            function getExpectedD2dOutgoingReflectedMessageUpdate(
                creatorIdentity: IdentityString,
                groupId: GroupId,
            ): NetworkExpectation {
                return NetworkExpectationFactory.reflectSingle((payload) => {
                    expect(payload.content).to.equal('outgoingMessageUpdate');
                    const msg = payload.outgoingMessageUpdate;
                    assert(
                        msg !== null && msg !== undefined,
                        'payload.outgoingMessageUpdate is null or undefined',
                    );
                    expect(msg.updates).to.have.length(1);
                    expect(msg.updates[0].conversation?.group).not.to.be.undefined;
                    expect(msg.updates[0].conversation?.group?.creatorIdentity).to.equal(
                        creatorIdentity,
                    );
                    expect(msg.updates[0].conversation?.group?.groupId).to.eql(
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
