import {expect} from 'chai';

import type {DbContactUid} from '~/common/db';
import {
    CspE2eDeliveryReceiptStatus,
    MessageDirection,
    MessageReaction,
    ReceiverType,
} from '~/common/enum';
import type {
    AnyInboundNonDeletedMessageModelStore,
    AnyOutboundNonDeletedMessageModelStore,
    Conversation,
} from '~/common/model';
import type {ModelStore} from '~/common/model/utils/model-store';
import {ReflectedDeliveryReceiptTask} from '~/common/network/protocol/task/d2d/reflected-delivery-receipt';
import {randomMessageId} from '~/common/network/protocol/utils';
import {
    type ContactConversationId,
    ensureIdentityString,
    type Nickname,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';
import {Identity} from '~/common/utils/identity';
import {
    addTestUserAsContact,
    createClientKey,
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
            nickname: 'user1' as Nickname,
            ck: createClientKey(),
            conversationId: {
                type: ReceiverType.CONTACT,
                identity: ensureIdentityString('USER0001'),
            } as ContactConversationId,
        };

        // Set up services, log printing and a conversation
        let services: TestServices;
        let conversation: ModelStore<Conversation>;
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

        it('process incoming delivery receipt for outbound message', async function () {
            const {crypto, device} = services;

            // Add outgoing message
            const messageId = randomMessageId(crypto);
            conversation.get().controller.addMessage.direct({
                direction: MessageDirection.OUTBOUND,
                type: 'text',
                id: messageId,
                text: `Message with ID ${messageId}`,
                createdAt: new Date(),
            });

            // Ensure that message does not yet have a reaction
            const msg = conversation
                .get()
                .controller.getMessage(messageId) as AnyOutboundNonDeletedMessageModelStore;
            assert(
                msg.get().view.deliveredAt === undefined,
                'Message should not yet be marked as delivered',
            );
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');
            assert(msg.get().view.reactions.length === 0, 'Message should not yet have a reaction');

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                const handle = new TestHandle(services, []);
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    device.identity.string,
                ).run(handle);
                handle.finish();
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
            expect(msg.get().view.reactions.length === 1);
            expect(msg.get().view.reactions[0], 'lastReaction').to.eql({
                reactionAt: decTimestamp,
                reaction: MessageReaction.DECLINE,
                senderIdentity: device.identity.string,
            });
        });

        it('process outgoing delivery receipt for inbound message', async function () {
            const {crypto, device} = services;

            // Add incoming message
            const messageId = randomMessageId(crypto);
            const originalReceivedAt = new Date();
            conversation.get().controller.addMessage.direct({
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
                const handle = new TestHandle(services, []);
                await new ReflectedDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                    device.identity.string,
                ).run(handle);
                handle.finish();
            }

            // Ensure that message does not yet have a reaction
            const msg = conversation
                .get()
                .controller.getMessage(messageId) as AnyInboundNonDeletedMessageModelStore;
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');
            assert(msg.get().view.reactions.length === 0, 'Message should not yet have a reaction');

            // A delivery receipt of type RECEIVED must be ignored for incoming messages
            await runTask(CspE2eDeliveryReceiptStatus.RECEIVED, new Date());
            expect(msg.get().view.receivedAt, 'receivedAt').to.deep.equal(originalReceivedAt);

            // Process READ
            const readTimestamp = secondsAgo(3);
            await runTask(CspE2eDeliveryReceiptStatus.READ, readTimestamp);
            expect(msg.get().view.readAt, 'readAt').to.deep.equal(readTimestamp);

            // Process ACKNOWLEDGED
            const ackTimestamp = secondsAgo(2);
            await runTask(CspE2eDeliveryReceiptStatus.ACKNOWLEDGED, ackTimestamp);
            assert(msg.get().view.reactions.length === 1, 'There should be one reaction');
            expect(msg.get().view.reactions[0], 'reactions').to.deep.equal({
                reactionAt: ackTimestamp,
                reaction: MessageReaction.ACKNOWLEDGE,
                senderIdentity: device.identity.string,
            });

            // Process DECLINED
            const decTimestamp = secondsAgo(1);
            await runTask(CspE2eDeliveryReceiptStatus.DECLINED, decTimestamp);
            // Ensure only one reactions with updated values
            assert(msg.get().view.reactions.length === 1);
            expect(msg.get().view.reactions[0], 'reactions').to.deep.equal({
                reactionAt: decTimestamp,
                reaction: MessageReaction.DECLINE,
                senderIdentity: device.identity.string,
            });
        });
    });
}
