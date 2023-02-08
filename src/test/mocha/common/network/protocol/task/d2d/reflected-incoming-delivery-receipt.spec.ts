import {expect} from 'chai';

import {type DbContactUid} from '~/common/db';
import {
    CspE2eDeliveryReceiptStatus,
    CspE2eDeliveryReceiptStatusUtils,
    MessageDirection,
    MessageReaction,
    ReceiverType,
} from '~/common/enum';
import {
    type AnyInboundMessageModelStore,
    type AnyOutboundMessageModelStore,
    type Conversation,
} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {ReflectedDeliveryReceiptTask} from '~/common/network/protocol/task/d2d/reflected-delivery-receipt';
import {randomMessageId} from '~/common/network/protocol/utils';
import {type ContactConversationId, ensureIdentityString} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestUserAsContact,
    makeKeypair,
    makeTestServices,
    TestHandle,
    type TestServices,
} from '~/test/mocha/common/backend-mocks';
import {secondsAgo} from '~/test/mocha/common/utils';

/**
 * Test incoming D2D delivery receipt task.
 *
 * Note: A lot of the functionality is already covered in `incoming-delivery-receipt.spec.ts`. Here
 * we focus on the difference that delivery receipts may be both incoming or outgoing.
 */
export function run(): void {
    describe('ReflectedDeliveryReceiptTask', function () {
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
        let conversation: LocalModelStore<Conversation>;
        this.beforeEach(function () {
            // Create test services
            services = makeTestServices(me);

            // Create conversation with user1
            const user1Uid = addTestUserAsContact(services.model, user1).ctx;
            const user1Conversation = services.model.conversations.getForReceiver({
                type: ReceiverType.CONTACT,
                uid: user1Uid,
            });
            assert(user1Conversation !== undefined, 'Conversation for user1 not found');
            conversation = user1Conversation;
        });
        this.afterEach(function () {
            if (this.currentTest?.state === 'failed') {
                console.log('--- Failed test logs start ---');
                services.logging.printLogs();
                console.log('--- Failed test logs end ---');
            }
        });

        it('process incoming delivery receipt for outgoing message', async function () {
            const {crypto} = services;

            // Add outgoing message
            const messageId = randomMessageId(crypto);
            const expectedMessageDirection = MessageDirection.OUTBOUND;
            conversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = conversation
                .get()
                .controller.getMessage(messageId) as AnyOutboundMessageModelStore;
            assert(
                msg.get().view.deliveredAt === undefined,
                'Message should not yet be marked as delivered',
            );
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');
            assert(
                msg.get().view.lastReaction === undefined,
                'Message should not yet have a reaction',
            );

            // Test handle
            const handle = new TestHandle(services, []);

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    expectedMessageDirection,
                ).run(handle);
            }

            // Mark as delivered
            const deliveredTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.RECEIVED, deliveredTimestamp);
            expect(msg.get().view.deliveredAt, 'deliveredAt').to.equal(deliveredTimestamp);

            // Mark as read
            const readTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.READ, readTimestamp);
            expect(msg.get().view.readAt, 'readAt').to.equal(readTimestamp);

            // Thumbs down
            const decTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.DECLINED, decTimestamp);
            expect(msg.get().view.lastReaction, 'lastReaction').to.eql({
                at: decTimestamp,
                type: MessageReaction.DECLINE,
            });
        });

        it('process outgoing delivery receipt for incoming message', async function () {
            const {crypto} = services;

            // Add incoming message
            const messageId = randomMessageId(crypto);
            const originalReceivedAt = new Date();
            const expectedMessageDirection = MessageDirection.INBOUND;
            conversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.INBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                sender: conversation.get().controller.receiver().ctx as DbContactUid,
                createdAt: new Date(),
                receivedAt: originalReceivedAt,
                raw: new Uint8Array(0),
            });

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    expectedMessageDirection,
                ).run(handle);
            }

            // Ensure that message does not yet have a reaction
            const msg = conversation
                .get()
                .controller.getMessage(messageId) as AnyInboundMessageModelStore;
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');
            assert(
                msg.get().view.lastReaction === undefined,
                'Message should not yet have a reaction',
            );

            // Test handle
            const handle = new TestHandle(services, []);

            // A delivery receipt of type RECEIVED must be ignored for incoming messages
            await runTask(CspE2eDeliveryReceiptStatus.RECEIVED, new Date());
            expect(msg.get().view.receivedAt, 'receivedAt').to.equal(originalReceivedAt);

            // Process READ
            const readTimestamp = secondsAgo(3);
            await runTask(CspE2eDeliveryReceiptStatus.READ, readTimestamp);
            expect(msg.get().view.readAt, 'readAt').to.equal(readTimestamp);

            // Process ACKNOWLEDGED
            const ackTimestamp = secondsAgo(2);
            await runTask(CspE2eDeliveryReceiptStatus.ACKNOWLEDGED, ackTimestamp);
            expect(msg.get().view.lastReaction, 'lastReaction').to.eql({
                at: ackTimestamp,
                type: MessageReaction.ACKNOWLEDGE,
            });

            // Process DECLINED
            const decTimestamp = secondsAgo(1);
            await runTask(CspE2eDeliveryReceiptStatus.DECLINED, decTimestamp);
            expect(msg.get().view.lastReaction, 'lastReaction').to.eql({
                at: decTimestamp,
                type: MessageReaction.DECLINE,
            });
        });

        it('ignore delivery receipt for inbound message when expecting outbound message', async function () {
            const {crypto} = services;

            // Add incoming message
            const messageId = randomMessageId(crypto);
            const originalReceivedAt = new Date();
            conversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.INBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                sender: conversation.get().controller.receiver().ctx as DbContactUid,
                createdAt: new Date(),
                receivedAt: originalReceivedAt,
                raw: new Uint8Array(0),
            });

            // Ensure that message does not yet have a reaction
            const msg = conversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            assert(
                msg.get().view.lastReaction === undefined,
                'Message should not yet have a reaction',
            );

            // Run task with expected direction OUTBOUND
            const handle = new TestHandle(services, []);
            for (const status of CspE2eDeliveryReceiptStatusUtils.ALL) {
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    new Date(),
                    MessageDirection.OUTBOUND,
                ).run(handle);
            }

            // Ensure that message was not modified
            const messageModel = msg.get();
            assert(messageModel.ctx === MessageDirection.INBOUND, 'Expected message to be inbound');
            expect(messageModel.view.receivedAt).to.equal(originalReceivedAt);
            expect(messageModel.view.readAt).to.be.undefined;
            expect(messageModel.view.lastReaction).to.be.undefined;
        });

        it('ignore delivery receipt for outbound message when expecting inbound message', async function () {
            const {crypto} = services;

            // Add outgoing message
            const messageId = randomMessageId(crypto);
            conversation.get().controller.addMessage.fromSync({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = conversation.get().controller.getMessage(messageId);
            assert(msg !== undefined, 'Message not found');
            assert(
                msg.get().view.lastReaction === undefined,
                'Message should not yet have a reaction',
            );

            // Run task with expected direction INBOUND
            const handle = new TestHandle(services, []);
            for (const status of CspE2eDeliveryReceiptStatusUtils.ALL) {
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    new Date(),
                    MessageDirection.INBOUND,
                ).run(handle);
            }

            // Ensure that message was not modified
            const messageModel = msg.get();
            assert(
                messageModel.ctx === MessageDirection.OUTBOUND,
                'Expected message to be outbound',
            );
            expect(messageModel.view.deliveredAt).to.be.undefined;
            expect(messageModel.view.readAt).to.be.undefined;
            expect(messageModel.view.lastReaction).to.be.undefined;
        });
    });
}
