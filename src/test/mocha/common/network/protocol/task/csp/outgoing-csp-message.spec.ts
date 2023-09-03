import {expect} from 'chai';

import {type DbGroupUid} from '~/common/db';
import {
    ConversationCategory,
    ConversationVisibility,
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspPayloadType,
    D2mPayloadType,
    GroupUserState,
} from '~/common/enum';
import {type Group, type GroupController, type GroupView} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {type CspE2eType} from '~/common/network/protocol';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type MessageProperties,
    OutgoingCspMessageTask,
    type ValidCspMessageTypeForReceiver,
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

        function getExpectedCspMessagesForGroupMember(
            member: TestUser,
            messageId: MessageId,
            type: CspE2eType,
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
                    expect(messageContainer.type).to.equal(type);
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

        describe('1:1 contact messaging', function () {
            it('should correctly send and reflect text messages', async function () {
                const {crypto, model} = services;

                const user1store = addTestUserAsContact(model, user1);

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
                const task = new OutgoingCspMessageTask(
                    services,
                    user1store.get(),
                    messageProperties,
                );

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
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
                        expect(message.updates[0].conversation?.contact).to.equal(
                            user1.identity.string,
                        );
                        expect(ensureMessageId(intoU64(message.updates[0].messageId))).to.equal(
                            messageProperties.messageId,
                        );
                    }),
                ];
                const handle = new TestHandle(services, expectations);
                await task.run(handle);
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
                groupStore: LocalModelStore<
                    Group,
                    Readonly<GroupView>,
                    GroupController,
                    DbGroupUid,
                    2
                >,
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
            if (creator !== 'self') {
                addTestUserAsContact(model, creator);
            }

            // Add group members to DB
            const memberStores = members.map((member) => addTestUserAsContact(model, member));

            // Create group in DB
            const groupId = randomGroupId(crypto);
            const groupStore = addTestGroup(model, {
                groupId,
                name,
                creatorIdentity: creator === 'self' ? me : creator.identity.string,
                createdAt: new Date(),
                userState: GroupUserState.MEMBER,
                members: memberStores.map((store) => store.ctx),
            });

            // Create new OutgoingMessageTask
            const properties = {
                messageId: randomMessageId(crypto),
                ...messageProperties,
            } as const;
            const task = new OutgoingCspMessageTask(services, groupStore.get(), properties);

            // Run task
            const expectations = testExpectations(groupStore, properties);
            const handle = new TestHandle(services, expectations);
            await task.run(handle);
            handle.finish();
        }

        describe('group messaging', function () {
            it('should send a message to all group members', async function () {
                await runSendGroupMessageTest({
                    name: 'Chüngelizüchter Pfäffikon',
                    creator: 'self',
                    members: [user1, user2],
                    testExpectations: (groupStore, messageProperties) => [
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        // Reflect a message to every member and wait for the ack.
                        //
                        // Note: This expects that the messages are sent in the same order as the group
                        //       members in the database.
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

                        // Finally, an OutgoingMessageUpdate.Sent is reflected.
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
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
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
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
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
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            gateway,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
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
                        // First, the outgoing message must be reflected.
                        getExpectedD2dOutgoingReflectedMessage(messageProperties),

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
                            messageProperties.messageId,
                            messageProperties.type,
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

                        // Note: This expects that the messages were sent in a synchronous manner in the order of
                        // the users in the database.
                        ...getExpectedCspMessagesForGroupMember(
                            gateway,
                            messageProperties.messageId,
                            messageProperties.type,
                        ),
                        ...getExpectedCspMessagesForGroupMember(
                            user2,
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
                const task = new OutgoingCspMessageTask(
                    services,
                    user1store.get(),
                    messageProperties,
                );

                // Run task
                const expectations: NetworkExpectation[] = [
                    // First, the outgoing message must be reflected
                    getExpectedD2dOutgoingReflectedMessage(messageProperties),

                    // No outgoing messages were sent
                    // No OutgoingMessageUpdate.Sent is reflected, since no message was sent
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
                    // Note: This expects that the messages are sent in the same order as the group
                    //       members in the database
                    ...getExpectedCspMessagesForGroupMember(
                        user1,
                        messageProperties.messageId,
                        messageProperties.type,
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
                const group = model.groups.add.fromSync(
                    {
                        groupId,
                        creatorIdentity: me,
                        createdAt: new Date(),
                        name: 'Chüngelizüchter Pfäffikon 🐇',
                        userState: GroupUserState.MEMBER,
                        category: ConversationCategory.DEFAULT,
                        visibility: ConversationVisibility.SHOW,
                        colorIndex: 0,
                    },
                    [user1store.ctx, user2store.ctx],
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
                    allowUserProfileDistribution: true,
                } as const;
                const task = new OutgoingCspMessageTask(services, group.get(), messageProperties);

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
    });
}
