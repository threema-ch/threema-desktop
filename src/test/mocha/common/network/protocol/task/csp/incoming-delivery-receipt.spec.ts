import {expect} from 'chai';

import type {DbContactUid} from '~/common/db';
import {
    CspE2eDeliveryReceiptStatus,
    CspE2eDeliveryReceiptStatusUtils,
    MessageDirection,
    MessageReaction,
    ReceiverType,
} from '~/common/enum';
import type {
    AnyOutboundMessageModel,
    AnyOutboundNonDeletedMessageModelStore,
    Contact,
    ContactView,
    Conversation,
} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {IncomingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/incoming-delivery-receipt';
import {randomMessageId} from '~/common/network/protocol/utils';
import {
    type ContactConversationId,
    ensureIdentityString,
    type Nickname,
    type IdentityString,
    type GroupConversationId,
} from '~/common/network/types';
import type {i53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestUserAsContact,
    createClientKey,
    makeTestServices,
    type TestGroup,
    TestHandle,
    type TestUser,
    type TestServices,
    addTestGroup,
} from '~/test/mocha/common/backend-mocks';

function createTestUsers(num: i53): TestUser[] {
    const res: TestUser[] = [];

    for (let i = 1; i < num + 1; i++) {
        const zeroes = i > 9 ? '00' : '000';
        const user = {
            identity: new Identity(ensureIdentityString(`USER${zeroes}${i}`)),
            nickname: `user${i}` as Nickname,
            ck: createClientKey(),
        };
        res.push(user);
    }

    return res;
}

/**
 * Test incoming CSP delivery receipt task.
 */
export function run(): void {
    describe('IncomingDeliveryReceiptTask', function () {
        const me = ensureIdentityString('MEMEMEME');
        const testUsers = createTestUsers(10);

        // Group for group reactions
        let testGroup: TestGroup;

        // Set up services, log printing and a conversation
        let services: TestServices;
        let user1: TestUser;

        let singleConversation: LocalModelStore<Conversation>;
        let singleConversationId: ContactConversationId;

        let groupConversation: LocalModelStore<Conversation>;
        let groupConversationId: GroupConversationId;
        let singleConversationReceiverIdentity: IdentityString;
        this.beforeEach(function () {
            // Create test services
            services = makeTestServices(me);

            assert(testUsers[0] !== undefined);
            user1 = testUsers[0];

            // Create conversation with user1
            const user1Uid = addTestUserAsContact(services.model, user1).ctx;
            const user1Conversation = services.model.conversations.getForReceiver({
                type: ReceiverType.CONTACT,
                uid: user1Uid,
            });
            assert(user1Conversation !== undefined, 'Conversation for user1 not found');
            singleConversation = user1Conversation;
            singleConversationId = {
                type: ReceiverType.CONTACT,
                identity: ensureIdentityString('USER0001'),
            };

            assert(
                singleConversation.get().view.type === ReceiverType.CONTACT,
                'Unexpected conversation type',
            );

            // Here we know that this is a contact view so this conversion is safe
            const receiverView = singleConversation.get().controller.receiver().get()
                .view as Readonly<Readonly<ContactView>>;
            singleConversationReceiverIdentity = receiverView.identity;

            // Set up a group for testing of group reactions
            const groupMembers: LocalModelStore<Contact>[] = [];
            for (const testUser of testUsers.slice(1)) {
                const userUid = addTestUserAsContact(services.model, testUser);
                groupMembers.push(userUid);
            }
            testGroup = {
                creator: 'me',
                members: groupMembers,
            };
            const groupModelStore = addTestGroup(services.model, testGroup);

            const group1conv = services.model.conversations.getForReceiver({
                type: ReceiverType.GROUP,
                uid: groupModelStore.ctx,
            });

            assert(group1conv !== undefined);
            groupConversation = group1conv;
            groupConversationId = {
                type: ReceiverType.GROUP,
                creatorIdentity: me,
                groupId: groupModelStore.get().view.groupId,
            };
        });

        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        /**
         * Test the processing of incoming RECEIVED or READ delivery receipts.
         */
        async function testReceivedOrRead(
            action: 'received' | 'read',
            status: CspE2eDeliveryReceiptStatus,
            getActionDate: (view: AnyOutboundMessageModel['view']) => Date | undefined,
        ): Promise<void> {
            const {crypto} = services;

            // Add three outgoing messages
            const messageIds = [
                randomMessageId(crypto),
                randomMessageId(crypto),
                randomMessageId(crypto),
            ] as const;
            for (const messageId of messageIds) {
                singleConversation.get().controller.addMessage.fromSync({
                    direction: MessageDirection.OUTBOUND,
                    type: 'text',
                    id: messageId,
                    text: `Message with ID ${messageId}`,
                    createdAt: new Date(),
                });
            }

            // Ensure that all messages are not yet marked as delivered or read
            for (const messageId of messageIds) {
                const msg = singleConversation.get().controller.getMessage(messageId)?.get();
                assert(msg !== undefined, 'Message not found');
                assert(msg.ctx === MessageDirection.OUTBOUND, 'Expected message to be outbound');
                assert(
                    getActionDate(msg.view) === undefined,
                    `Message should not yet be marked as ${action}`,
                );
            }

            assert(
                singleConversation.get().view.type === ReceiverType.CONTACT,
                'Unexpected conversation type',
            );

            // Here we know that this is a contact view so this conversion is safe
            const receiverView = singleConversation.get().controller.receiver().get()
                .view as Readonly<Readonly<ContactView>>;
            singleConversationReceiverIdentity = receiverView.identity;
            // Mark first two messages as received or read
            const actionTimestamp = new Date();

            const task = new IncomingDeliveryReceiptTask(
                services,
                randomMessageId(crypto),
                singleConversationId,
                {
                    status,
                    messageIds: [messageIds[0], messageIds[1]],
                },
                actionTimestamp,
                singleConversationReceiverIdentity,
            );

            // Run task. No network side effects expected.
            const handle = new TestHandle(services, []);
            await task.run(handle);
            handle.finish();

            // Ensure that first two messages (but not the third) were marked as received or read
            for (const [index, messageId] of messageIds.entries()) {
                const msg = singleConversation.get().controller.getMessage(messageId)?.get();
                assert(msg !== undefined, `Message ${index + 1} not found`);
                assert(
                    msg.ctx === MessageDirection.OUTBOUND,
                    `Expected message ${index + 1} to be outbound`,
                );
                if (index < 2) {
                    assert(
                        getActionDate(msg.view) !== undefined,
                        `Message ${index + 1} should be marked as ${action}, ${msg.view.direction}`,
                    );
                    expect(
                        getActionDate(msg.view),
                        `Wrong ${action} date for message ${index + 1}`,
                    ).to.equal(actionTimestamp);
                } else {
                    assert(
                        getActionDate(msg.view) === undefined,
                        `Message ${index + 1} should not be marked as ${action}`,
                    );
                }
                assert(msg.view.reactions.length === 0, 'Message should not have a reaction');
            }
        }

        it('process incoming "received" for outbound message', async function () {
            await testReceivedOrRead(
                'received',
                CspE2eDeliveryReceiptStatus.RECEIVED,
                (view) => view.deliveredAt,
            );
        });

        it('process incoming "read" for outbound message', async function () {
            await testReceivedOrRead(
                'read',
                CspE2eDeliveryReceiptStatus.READ,
                (view) => view.readAt,
            );
        });

        it('process incoming "acknowledge" or "decline" for outbound message', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

            // Add outgoing message
            const messageId = randomMessageId(crypto);
            singleConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = singleConversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            assert(msg.get().view.reactions.length === 0, 'Message should not yet have a reaction');

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    singleConversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    singleConversationReceiverIdentity,
                ).run(handle);
                handle.finish();
            }

            // Give thumbs up
            const ackTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.ACKNOWLEDGED, ackTimestamp);

            // Ensure that reaction was recorded
            expect(msg.get().view.reactions.length === 1);
            expect(msg.get().view.reactions[0]).to.eql({
                reactionAt: ackTimestamp,
                reaction: MessageReaction.ACKNOWLEDGE,
                senderIdentity: singleConversationReceiverIdentity,
            });

            // Change to thumbs down
            const decTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.DECLINED, decTimestamp);

            // Ensure that reaction was recorded
            expect(msg.get().view.reactions[0]).to.eql({
                reactionAt: decTimestamp,
                reaction: MessageReaction.DECLINE,
                senderIdentity: singleConversationReceiverIdentity,
            });
        });

        /**
         * SE-233: Do not process incoming delivery receipts for incoming messages!
         */
        it('ignore reactions for incoming message', async function () {
            const {crypto} = services;

            // Add incoming message
            const messageId = randomMessageId(crypto);
            const originalReceivedAt = new Date();
            singleConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.INBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                sender: singleConversation.get().controller.receiver().ctx as DbContactUid,
                createdAt: new Date(),
                receivedAt: originalReceivedAt,
                raw: new Uint8Array(0),
            });

            // Ensure that message does not yet have a reaction
            const msg = singleConversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            expect(msg.get().view.reactions, 'Message should not yet have a reaction').to.be.empty;

            // Process all types of delivery receipt
            for (const status of CspE2eDeliveryReceiptStatusUtils.ALL) {
                const handle = new TestHandle(services, []);
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    singleConversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    new Date(),
                    singleConversationReceiverIdentity,
                ).run(handle);
                handle.finish();
            }

            // Ensure that message was not modified
            const messageModel = msg.get();
            assert(messageModel.ctx === MessageDirection.INBOUND, 'Expected message to be inbound');
            expect(
                messageModel.view.receivedAt,
                'Expected received at to not have been altered',
            ).to.deep.equal(originalReceivedAt);
            expect(messageModel.view.readAt).to.be.undefined;
            expect(messageModel.view.reactions, 'Expected message to not have any reactions').to.be
                .empty;
        });

        it('ignore repeated "received" or "read" delivery receipts', async function () {
            const {crypto} = services;

            // Add outgoing message
            const messageId = randomMessageId(crypto);
            singleConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = singleConversation
                .get()
                .controller.getMessage(messageId) as AnyOutboundNonDeletedMessageModelStore;
            assert(
                msg.get().view.deliveredAt === undefined,
                'Message should not yet be marked as delivered',
            );
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                const handle = new TestHandle(services, []);
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    singleConversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    singleConversationReceiverIdentity,
                ).run(handle);
                handle.finish();
            }

            // Mark as delivered twice: Only the first timestamp should be used
            const deliveredTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.RECEIVED, deliveredTimestamp);
            expect(msg.get().view.deliveredAt).to.equal(deliveredTimestamp);
            await runTask(CspE2eDeliveryReceiptStatus.RECEIVED, new Date());
            expect(msg.get().view.deliveredAt).to.equal(deliveredTimestamp);

            // Mark as read twice: Only the first timestamp should be used
            const readTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.READ, readTimestamp);
            expect(msg.get().view.readAt).to.equal(readTimestamp);
            await runTask(CspE2eDeliveryReceiptStatus.READ, new Date());
            expect(msg.get().view.readAt).to.equal(readTimestamp);
        });

        it('should register multiple incoming reactions on an outbound message in a group conversation', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

            // Add outbound message
            const messageId = randomMessageId(crypto);
            groupConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = groupConversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            expect(msg.get().view.reactions, 'Message should not yet have a reaction').to.be.empty;

            const reactions = testGroup.members.map((value, idx) => {
                const senderIdentity = value.get().view.identity;
                return {
                    status:
                        idx % 2 === 0
                            ? CspE2eDeliveryReceiptStatus.DECLINED
                            : CspE2eDeliveryReceiptStatus.ACKNOWLEDGED,
                    senderIdentity,
                    timestamp: new Date(),
                };
            });

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
                senderIdentity: IdentityString,
            ): Promise<void> {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    groupConversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    senderIdentity,
                ).run(handle);
                handle.finish();
            }

            for (const reaction of reactions) {
                await runTask(
                    reaction.status as CspE2eDeliveryReceiptStatus,
                    reaction.timestamp,
                    reaction.senderIdentity,
                );
            }

            function reactionToStatus(
                status: MessageReaction.ACKNOWLEDGE | MessageReaction.DECLINE,
            ): CspE2eDeliveryReceiptStatus {
                switch (status) {
                    case MessageReaction.ACKNOWLEDGE:
                        return CspE2eDeliveryReceiptStatus.ACKNOWLEDGED;
                    case MessageReaction.DECLINE:
                        return CspE2eDeliveryReceiptStatus.DECLINED;
                    default:
                        return unreachable(status);
                }
            }

            // Ensure that the reactions were all registered
            expect(
                msg.get().view.reactions.length,
                'Number of reactions should be consistent',
            ).to.equal(reactions.length);

            // Ensure that the messages were correctly registered
            // and that we added this reaction exactly once
            for (const reaction of reactions) {
                const correspondingReaction = msg
                    .get()
                    .view.reactions.filter((r) => r.senderIdentity === reaction.senderIdentity);
                expect(
                    correspondingReaction.length,
                    'There should be exactly one reaction per sender',
                ).to.equal(1);
                // Dummy check since the compiler cant handle it otherwise
                assert(correspondingReaction[0] !== undefined);
                assert(
                    reactionToStatus(correspondingReaction[0]?.reaction) === reaction.status,
                    `The reaction of ${reaction.senderIdentity} was ${correspondingReaction[0]?.reaction} but was expected to be ${reaction.status}`,
                );
                assert(
                    correspondingReaction[0]?.reactionAt === reaction.timestamp,
                    `The reaction timestamp of ${reaction.senderIdentity} was ${correspondingReaction[0]?.reactionAt} but was expected to be ${reaction.timestamp}`,
                );
            }

            // Ensure that reactions are updated and not added if sent by the same group member
            const reactionLength = msg.get().view.reactions.length;

            const lastReaction = reactions.at(-1);
            assert(lastReaction !== undefined, 'There should be at least one reaction');
            // Change the reactions
            lastReaction.status =
                (reactions.length - 1) % 2 === 0
                    ? CspE2eDeliveryReceiptStatus.ACKNOWLEDGED
                    : CspE2eDeliveryReceiptStatus.DECLINED;

            await runTask(
                lastReaction.status as CspE2eDeliveryReceiptStatus,
                lastReaction.timestamp,
                lastReaction.senderIdentity,
            );

            assert(
                msg.get().view.reactions.length === reactionLength,
                'The reaction length should not have been changed',
            );
            const changedLastReaction = msg
                .get()
                .view.reactions.filter((r) => r.senderIdentity === lastReaction.senderIdentity);
            assert(
                changedLastReaction.length === 1,
                'There should be exactly one reaction per sender',
            );
            // Dummy check since the compiler cant handle it otherwise
            assert(changedLastReaction[0] !== undefined);
            assert(
                reactionToStatus(changedLastReaction[0].reaction) === lastReaction.status &&
                    changedLastReaction[0].reactionAt === lastReaction.timestamp,
                'The changed reaction should correspond',
            );

            const newReactions = [...reactions.slice(0, reactionLength - 1), lastReaction];

            // Ensure that the other reactions where not modified
            for (const reaction of newReactions) {
                const correspondingReaction = msg
                    .get()
                    .view.reactions.filter((r) => r.senderIdentity === reaction.senderIdentity);
                assert(
                    correspondingReaction.length === 1,
                    'There should be only one reaction per sender',
                );

                // Dummy check since the compiler cant handle it otherwise
                assert(correspondingReaction[0] !== undefined);
                assert(
                    reactionToStatus(correspondingReaction[0].reaction) === reaction.status &&
                        correspondingReaction[0].reactionAt === reaction.timestamp,
                    'The reaction should correspond',
                );
            }

            const myTimestamp = new Date();
            // Check that it is possible to add our own reaction
            await runTask(CspE2eDeliveryReceiptStatus.ACKNOWLEDGED, myTimestamp, me);

            assert(
                msg.get().view.reactions.length === newReactions.length + 1,
                'There should be exactly one added reaction',
            );
            const myReaction = msg.get().view.reactions.filter((r) => r.senderIdentity === me);
            assert(myReaction.length === 1, 'There should be only one reaction per sender');

            // Dummy check since the compiler cant handle it otherwise
            assert(myReaction[0] !== undefined);
            assert(
                reactionToStatus(myReaction[0].reaction) ===
                    CspE2eDeliveryReceiptStatus.ACKNOWLEDGED &&
                    myReaction[0]?.reactionAt === myTimestamp,
                'My reaction should correspond',
            );
        });

        // This is essentially the same test as for an outbound message
        // Implicitly, we test here too if we accept incoming reactions of the sender of a message on his/her own message
        it('should register multiple incoming reactions on an inbound message in a group conversation', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

            // Add inbound message
            const messageId = randomMessageId(crypto);
            const originalReceivedAt = new Date();
            const sender = testGroup.members[0];
            assert(sender !== undefined);
            groupConversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.INBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                sender: sender.ctx,
                createdAt: new Date(),
                receivedAt: originalReceivedAt,
                raw: new Uint8Array(0),
            });

            // Ensure that message does not yet have a reaction
            const msg = groupConversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            assert(msg.get().view.reactions.length === 0, 'Message should not yet have a reaction');

            const reactions = testGroup.members.map((value, idx) => {
                const senderIdentity = value.get().view.identity;
                return {
                    status:
                        idx % 2 === 0
                            ? CspE2eDeliveryReceiptStatus.DECLINED
                            : CspE2eDeliveryReceiptStatus.ACKNOWLEDGED,
                    senderIdentity,
                    timestamp: new Date(),
                };
            });

            function reactionToStatus(
                status: MessageReaction.ACKNOWLEDGE | MessageReaction.DECLINE,
            ): CspE2eDeliveryReceiptStatus {
                switch (status) {
                    case MessageReaction.ACKNOWLEDGE:
                        return CspE2eDeliveryReceiptStatus.ACKNOWLEDGED;
                    case MessageReaction.DECLINE:
                        return CspE2eDeliveryReceiptStatus.DECLINED;
                    default:
                        return unreachable(status);
                }
            }

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
                senderIdentity: IdentityString,
            ): Promise<void> {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    groupConversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    senderIdentity,
                ).run(handle);
                handle.finish();
            }

            for (const reaction of reactions) {
                await runTask(
                    reaction.status as CspE2eDeliveryReceiptStatus,
                    reaction.timestamp,
                    reaction.senderIdentity,
                );
            }

            // Ensure that the reactions were all registered
            assert(msg.get().view.reactions.length === reactions.length);
            // Ensure that the messages were correctly registered
            // and that we added this reaction exactly once
            for (const reaction of reactions) {
                const correspondingReaction = msg
                    .get()
                    .view.reactions.filter((r) => r.senderIdentity === reaction.senderIdentity);
                assert(
                    correspondingReaction.length === 1,
                    'There should be exactly one reaction per sender',
                );
                // Dummy check since the compiler cant handle it otherwise
                assert(correspondingReaction[0] !== undefined);
                assert(
                    reactionToStatus(correspondingReaction[0]?.reaction) === reaction.status,
                    `The reaction of ${reaction.senderIdentity} should correspond but is ${correspondingReaction[0]?.reaction}`,
                );
                assert(
                    correspondingReaction[0]?.reactionAt === reaction.timestamp,
                    `The reaction timestamp of ${reaction.senderIdentity} should correspond to ${reaction.timestamp} but is ${correspondingReaction[0]?.reactionAt}`,
                );
            }

            // Ensure that reactions are updated and not added if sent by the same group member
            const reactionLength = msg.get().view.reactions.length;

            const lastReaction = reactions[reactions.length - 1];
            assert(lastReaction !== undefined);
            // Change the reactions
            lastReaction.status =
                (reactions.length - 1) % 2 === 0
                    ? CspE2eDeliveryReceiptStatus.ACKNOWLEDGED
                    : CspE2eDeliveryReceiptStatus.DECLINED;

            await runTask(
                lastReaction.status as CspE2eDeliveryReceiptStatus,
                lastReaction.timestamp,
                lastReaction.senderIdentity,
            );

            assert(msg.get().view.reactions.length === reactionLength);
            const correspondingReaction = msg
                .get()
                .view.reactions.filter((r) => r.senderIdentity === lastReaction.senderIdentity);
            assert(
                correspondingReaction.length === 1,
                'There should be exactly one reaction per sender',
            );
            // Dummy check since the compiler cant handle it otherwise
            assert(correspondingReaction[0] !== undefined);
            assert(
                reactionToStatus(correspondingReaction[0]?.reaction) === lastReaction.status,
                `The reaction of ${lastReaction.senderIdentity} should correspond but is ${correspondingReaction[0]?.reaction}`,
            );
            assert(
                correspondingReaction[0]?.reactionAt === lastReaction.timestamp,
                `The reaction timestamp of ${lastReaction.senderIdentity} should correspond to ${lastReaction.timestamp} but is ${correspondingReaction[0]?.reactionAt}`,
            );

            const newReactions = [...reactions.slice(0, reactionLength - 1), lastReaction];

            // Ensure that the other reactions where not modified
            for (const reaction of newReactions) {
                const newReaction = msg
                    .get()
                    .view.reactions.filter((r) => r.senderIdentity === reaction.senderIdentity);
                assert(newReaction.length === 1, 'There should be exactly one reaction per sender');
                // Dummy check since the compiler cant handle it otherwise
                assert(newReaction[0] !== undefined);
                assert(
                    reactionToStatus(newReaction[0]?.reaction) === reaction.status,
                    `The reaction of ${reaction.senderIdentity} should correspond but is ${newReaction[0]?.reaction}`,
                );
                assert(
                    newReaction[0]?.reactionAt === reaction.timestamp,
                    `The reaction timestamp of ${reaction.senderIdentity} should correspond to ${reaction.timestamp} but is ${newReaction[0]?.reactionAt}`,
                );
            }
        });
    });
}
