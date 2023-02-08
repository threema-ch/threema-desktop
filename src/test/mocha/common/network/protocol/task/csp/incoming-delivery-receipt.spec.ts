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
    type AnyOutboundMessageModel,
    type AnyOutboundMessageModelStore,
    type Conversation,
} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {IncomingDeliveryReceiptTask} from '~/common/network/protocol/task/csp/incoming-delivery-receipt';
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

/**
 * Test incoming CSP delivery receipt task.
 */
export function run(): void {
    describe('IncomingDeliveryReceiptTask', function () {
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
            ];
            for (const messageId of messageIds) {
                conversation.get().controller.addMessage.fromSync({
                    direction: MessageDirection.OUTBOUND,
                    type: 'text',
                    id: messageId,
                    text: `Message with ID ${messageId}`,
                    createdAt: new Date(),
                });
            }

            // Ensure that all messages are not yet marked as delivered or read
            for (const messageId of messageIds) {
                const msg = conversation.get().controller.getMessage(messageId)?.get();
                assert(msg !== undefined, 'Message not found');
                assert(msg.ctx === MessageDirection.OUTBOUND, 'Expected message to be outbound');
                assert(
                    getActionDate(msg.view) === undefined,
                    `Message should not yet be marked as ${action}`,
                );
            }

            // Mark first two messages as received or read
            const actionTimestamp = new Date();
            const task = new IncomingDeliveryReceiptTask(
                services,
                randomMessageId(crypto),
                user1.conversationId,
                {
                    status,
                    messageIds: [messageIds[0], messageIds[1]],
                },
                actionTimestamp,
            );

            // Run task. No network side effects expected.
            const handle = new TestHandle(services, []);
            await task.run(handle);

            // Ensure that first two messages (but not the third) were marked as received or read
            for (let i = 0; i < 3; i++) {
                const msg = conversation.get().controller.getMessage(messageIds[i])?.get();
                assert(msg !== undefined, `Message ${i + 1} not found`);
                assert(
                    msg.ctx === MessageDirection.OUTBOUND,
                    `Expected message ${i + 1} to be outbound`,
                );
                if (i < 2) {
                    assert(
                        getActionDate(msg.view) !== undefined,
                        `Message ${i + 1} should be marked as ${action}`,
                    );
                    expect(
                        getActionDate(msg.view),
                        `Wrong ${action} date for message ${i + 1}`,
                    ).to.equal(actionTimestamp);
                } else {
                    assert(
                        getActionDate(msg.view) === undefined,
                        `Message ${i + 1} should not be marked as ${action}`,
                    );
                }
                assert(msg.view.lastReaction === undefined, 'Message should not have a reaction');
            }
        }

        it('process incoming "received" for outgoing message', async function () {
            await testReceivedOrRead(
                'received',
                CspE2eDeliveryReceiptStatus.RECEIVED,
                (view) => view.deliveredAt,
            );
        });

        it('process incoming "read" for outgoing message', async function () {
            await testReceivedOrRead(
                'read',
                CspE2eDeliveryReceiptStatus.READ,
                (view) => view.readAt,
            );
        });

        it('process incoming "acknowledge" or "decline" for outgoing message', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

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

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                ).run(handle);
            }

            // Give thumbs up
            const ackTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.ACKNOWLEDGED, ackTimestamp);

            // Ensure that reaction was recorded
            expect(msg.get().view.lastReaction).to.eql({
                at: ackTimestamp,
                type: MessageReaction.ACKNOWLEDGE,
            });

            // Change to thumbs down
            const decTimestamp = new Date();
            await runTask(CspE2eDeliveryReceiptStatus.DECLINED, decTimestamp);

            // Ensure that reaction was recorded
            expect(msg.get().view.lastReaction).to.eql({
                at: decTimestamp,
                type: MessageReaction.DECLINE,
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

            // Process all types of delivery receipt
            const handle = new TestHandle(services, []);
            for (const status of CspE2eDeliveryReceiptStatusUtils.ALL) {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    new Date(),
                ).run(handle);
            }

            // Ensure that message was not modified
            const messageModel = msg.get();
            assert(messageModel.ctx === MessageDirection.INBOUND, 'Expected message to be inbound');
            expect(messageModel.view.receivedAt).to.equal(originalReceivedAt);
            expect(messageModel.view.readAt).to.be.undefined;
            expect(messageModel.view.lastReaction).to.be.undefined;
        });

        it('ignore repeated "received" or "read" delivery receipts', async function () {
            const {crypto} = services;
            const handle = new TestHandle(services, []);

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
            const msg = conversation
                .get()
                .controller.getMessage(messageId) as AnyOutboundMessageModelStore;
            assert(
                msg.get().view.deliveredAt === undefined,
                'Message should not yet be marked as delivered',
            );
            assert(msg.get().view.readAt === undefined, 'Message should not yet be marked as read');

            async function runTask(
                status: CspE2eDeliveryReceiptStatus,
                timestamp: Date,
            ): Promise<void> {
                await new IncomingDeliveryReceiptTask(
                    services,
                    randomMessageId(crypto),
                    user1.conversationId,
                    {
                        status,
                        messageIds: [messageId],
                    },
                    timestamp,
                ).run(handle);
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
    });
}
