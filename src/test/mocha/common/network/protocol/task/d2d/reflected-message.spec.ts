import {expect} from 'chai';

import {
    CspE2eConversationType,
    CspE2eGroupConversationType,
    MessageDirection,
    ReceiverType,
} from '~/common/enum';
import {type Contact, type Conversation} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type d2d} from '~/common/network/protobuf';
import {ReflectedIncomingMessageTask} from '~/common/network/protocol/task/d2d/reflected-incoming-message';
import {ReflectedOutgoingMessageTask} from '~/common/network/protocol/task/d2d/reflected-outgoing-message';
import {randomGroupId, randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {
    type ContactConversationId,
    ensureIdentityString,
    type GroupId,
    type IdentityString,
    type MessageId,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {Identity} from '~/common/utils/identity';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {
    addTestGroup,
    addTestUserAsContact,
    makeKeypair,
    makeTestServices,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {secondsAgo} from '~/test/mocha/common/utils';

/**
 * Test incoming D2D message task.
 */
export function run(): void {
    describe('Reflected message tasks', function () {
        const me = ensureIdentityString('MEMEMEME');
        const user1 = {
            identity: new Identity(ensureIdentityString('USER0001')),
            nickname: 'user1',
            keypair: makeKeypair(),
            conversationId: {
                type: ReceiverType.CONTACT,
                identity: ensureIdentityString('USER0001'),
            } as ContactConversationId,
        };

        // Set up services, log printing and a conversation
        let services: TestServices;
        let user: LocalModelStore<Contact>;
        let userConversation: LocalModelStore<Conversation>;
        let groupId: GroupId;
        let groupConversation: LocalModelStore<Conversation>;
        this.beforeEach(function () {
            // Create test services
            services = makeTestServices(me);

            // Create user and conversation
            user = addTestUserAsContact(services.model, user1);
            userConversation = user.get().controller.conversation();

            // Create group and conversation
            groupId = randomGroupId(services.crypto);
            const group = addTestGroup(services.model, {
                groupId,
                creatorIdentity: user1.identity.string,
                name: 'Group of the group members',
                members: [user.ctx],
            });
            groupConversation = group.get().controller.conversation();
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        describe('ReflectedIncomingMessageTask', function () {
            it('process reflected incoming text message from contact', async function () {
                const {crypto} = services;

                // Process incoming reflected message from user1
                const messageId = randomMessageId(crypto);
                const text = 'Hello Pfäffikon';
                const createdAt = secondsAgo(20);
                const reflectedAt = secondsAgo(10);
                const messageEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode(text),
                });
                const reflectedMessage: d2d.IncomingMessage = {
                    senderIdentity: user1.identity.string,
                    messageId: intoUnsignedLong(messageId),
                    createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                    type: CspE2eConversationType.TEXT,
                    body: messageEncoder.encode(new Uint8Array(messageEncoder.byteLength())),
                };
                const task = new ReflectedIncomingMessageTask(
                    services,
                    reflectedMessage,
                    reflectedAt,
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message exists in conversation
                const messages = userConversation.get().controller.getAllMessages().get();
                expect(messages.size, 'Conversation message count').to.equal(1);
                const [message] = [...messages.values()];
                assert(message.ctx === MessageDirection.INBOUND, 'Wrong message direction');
                assert(message.type === 'text', `Wrong message type: ${message.type}`);
                expect(message.get().view.createdAt, 'createdAt').to.eql(createdAt);
                expect(message.get().view.receivedAt, 'receivedAt').to.eql(reflectedAt);
                expect(message.get().view.text).to.equal(text);
            });

            it('process reflected incoming text message from group', async function () {
                const {crypto} = services;

                // Process incoming reflected message from group
                const messageId = randomMessageId(crypto);
                const text = 'Hello Pfäffikon';
                const createdAt = secondsAgo(20);
                const reflectedAt = secondsAgo(10);
                const messageEncoder = structbuf.bridge.encoder(
                    structbuf.csp.e2e.GroupMemberContainer,
                    {
                        creatorIdentity: user1.identity.bytes,
                        groupId,
                        innerData: structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                            text: UTF8.encode(text),
                        }),
                    },
                );
                const reflectedMessage: d2d.IncomingMessage = {
                    senderIdentity: user1.identity.string,
                    messageId: intoUnsignedLong(messageId),
                    createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                    type: CspE2eGroupConversationType.GROUP_TEXT,
                    body: messageEncoder.encode(new Uint8Array(messageEncoder.byteLength())),
                };
                const task = new ReflectedIncomingMessageTask(
                    services,
                    reflectedMessage,
                    reflectedAt,
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message exists in group conversation, not in contact conversation
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(1);
                const [message] = [...groupMessages.values()];
                assert(message.ctx === MessageDirection.INBOUND, 'Wrong message direction');
                assert(message.type === 'text', `Wrong message type: ${message.type}`);
                expect(message.get().view.createdAt, 'createdAt').to.eql(createdAt);
                expect(message.get().view.receivedAt, 'receivedAt').to.eql(reflectedAt);
                expect(message.get().view.text).to.equal(text);
            });
        });

        describe('ReflectedOutgoingMessageTask', function () {
            /**
             * Create an outgoing reflected message.
             *
             * The {@link d2dConversationId} will be put into the conversation ID field of the
             * protobuf message.
             *
             * If the {@link cspGroupContainer} information is set, then the message will be wrapped
             * in group-member-container.
             */
            function makeMessage(
                messageId: MessageId,
                createdAt: Date,
                type: CspE2eConversationType.TEXT | CspE2eGroupConversationType.GROUP_TEXT,
                text: string,
                d2dConversationId: d2d.ConversationId,
                cspGroupContainer?: {creatorIdentity: IdentityString; groupId: GroupId},
            ): d2d.OutgoingMessage {
                const textMessageEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.Text, {
                    text: UTF8.encode(text),
                });
                let messageEncoder;
                if (cspGroupContainer !== undefined) {
                    messageEncoder = structbuf.bridge.encoder(
                        structbuf.csp.e2e.GroupMemberContainer,
                        {
                            creatorIdentity: UTF8.encode(cspGroupContainer.creatorIdentity),
                            groupId: cspGroupContainer.groupId,
                            innerData: textMessageEncoder,
                        },
                    );
                } else {
                    messageEncoder = textMessageEncoder;
                }
                const reflectedMessage: d2d.OutgoingMessage = {
                    conversation: d2dConversationId,
                    messageId: intoUnsignedLong(messageId),
                    threadMessageId: undefined,
                    createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                    type,
                    body: messageEncoder.encode(new Uint8Array(messageEncoder.byteLength())),
                };
                return reflectedMessage;
            }

            it('process reflected outgoing text message to contact', async function () {
                const {crypto} = services;

                // Process outgoing reflected message to user
                const messageId = randomMessageId(crypto);
                const createdAt = new Date();
                const text = 'Hello Pfäffikon';
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(messageId, createdAt, CspE2eConversationType.TEXT, text, {
                        id: 'contact',
                        contact: user1.identity.string,
                        group: undefined,
                        distributionList: undefined,
                    }),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message exists in conversation
                const messages = userConversation.get().controller.getAllMessages().get();
                expect(messages.size, 'Conversation message count').to.equal(1);
                const [message] = [...messages.values()];
                assert(message.ctx === MessageDirection.OUTBOUND, 'Wrong message direction');
                assert(message.type === 'text', `Wrong message type: ${message.type}`);
                expect(message.get().view.createdAt, 'createdAt').to.eql(createdAt);
                expect(message.get().view.sentAt, 'sentAt').to.be.undefined; // Not yet set
                expect(message.get().view.text).to.equal(text);
            });

            it('process reflected outgoing text message to group', async function () {
                const {crypto} = services;

                // Process outgoing reflected message to group
                const messageId = randomMessageId(crypto);
                const createdAt = new Date();
                const text = 'Bonjour Pfäffikon';
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        createdAt,
                        CspE2eGroupConversationType.GROUP_TEXT,
                        text,
                        {
                            id: 'group',
                            contact: undefined,
                            group: {
                                groupId: intoUnsignedLong(groupId),
                                creatorIdentity: user1.identity.string,
                            },
                            distributionList: undefined,
                        },
                        {creatorIdentity: user1.identity.string, groupId},
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message exists in group conversation, not in contact conversation
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(1);
                const [message] = [...groupMessages.values()];
                assert(message.ctx === MessageDirection.OUTBOUND, 'Wrong message direction');
                assert(message.type === 'text', `Wrong message type: ${message.type}`);
                expect(message.get().view.createdAt, 'createdAt').to.eql(createdAt);
                expect(message.get().view.sentAt, 'receivedAt').to.be.undefined; // Not yet set
                expect(message.get().view.text).to.equal(text);
            });

            it('reject text message bytes directed at group', async function () {
                const {crypto} = services;

                const messageId = randomMessageId(crypto);
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        new Date(),
                        CspE2eConversationType.TEXT,
                        'Buongiorno Pfäffikon',
                        {
                            id: 'group',
                            contact: undefined,
                            group: {
                                groupId: intoUnsignedLong(groupId),
                                creatorIdentity: user1.identity.string,
                            },
                            distributionList: undefined,
                        },
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message wasn't processed
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(0);
            });

            it('reject group text message bytes directed at contact', async function () {
                const {crypto} = services;

                const messageId = randomMessageId(crypto);
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        new Date(),
                        CspE2eGroupConversationType.GROUP_TEXT,
                        'Buongiorno Pfäffikon',
                        {
                            id: 'contact',
                            contact: user1.identity.string,
                            group: undefined,
                            distributionList: undefined,
                        },
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message wasn't processed
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(0);
            });

            it('reject text message directed at group', async function () {
                const {crypto} = services;

                const messageId = randomMessageId(crypto);
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        new Date(),
                        // Type: Contact
                        CspE2eConversationType.TEXT,
                        'Buongiorno Pfäffikon',
                        // Protobuf: Group
                        {
                            id: 'group',
                            contact: undefined,
                            group: {
                                groupId: intoUnsignedLong(groupId),
                                creatorIdentity: user1.identity.string,
                            },
                            distributionList: undefined,
                        },
                        // CSP: Contact
                        undefined,
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message wasn't processed
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(0);
            });

            it('reject group text message directed at contact', async function () {
                const {crypto} = services;

                const messageId = randomMessageId(crypto);
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        new Date(),
                        // Type: Group
                        CspE2eGroupConversationType.GROUP_TEXT,
                        'Buongiorno Pfäffikon',
                        // Protobuf: Contact
                        {
                            id: 'contact',
                            contact: user1.identity.string,
                            group: undefined,
                            distributionList: undefined,
                        },
                        // CSP: Group
                        {creatorIdentity: user1.identity.string, groupId},
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message wasn't processed
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation message count').to.equal(0);
            });

            it('reject group message conversation mismatch', async function () {
                const {crypto} = services;

                // Create second group
                const groupId2 = randomGroupId(services.crypto);
                const group2 = addTestGroup(services.model, {
                    groupId: groupId2,
                    creatorIdentity: user1.identity.string,
                    name: 'Group 2 of the group members',
                    members: [user.ctx],
                });
                const groupConversation2 = group2.get().controller.conversation();

                const messageId = randomMessageId(crypto);
                const task = new ReflectedOutgoingMessageTask(
                    services,
                    makeMessage(
                        messageId,
                        new Date(),
                        CspE2eGroupConversationType.GROUP_TEXT,
                        'Buongiorno Pfäffikon',
                        // Protobuf: Group 1
                        {
                            id: 'group',
                            contact: undefined,
                            group: {
                                creatorIdentity: user1.identity.string,
                                groupId: intoUnsignedLong(groupId),
                            },
                            distributionList: undefined,
                        },
                        // CSP: Group 2
                        {creatorIdentity: user1.identity.string, groupId: groupId2},
                    ),
                    new Date(),
                );
                const handle = new TestHandle(services, []);
                await task.run(handle);
                handle.finish();

                // Ensure that message wasn't processed
                const userMessages = userConversation.get().controller.getAllMessages().get();
                expect(userMessages.size, 'User conversation message count').to.equal(0);
                const groupMessages = groupConversation.get().controller.getAllMessages().get();
                expect(groupMessages.size, 'Group conversation 1 message count').to.equal(0);
                const groupMessages2 = groupConversation2.get().controller.getAllMessages().get();
                expect(groupMessages2.size, 'Group conversation 2 message count').to.equal(0);
            });
        });
    });
}
