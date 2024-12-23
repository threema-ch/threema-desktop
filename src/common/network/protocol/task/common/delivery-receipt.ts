import {
    CspE2eDeliveryReceiptStatus,
    CspE2eDeliveryReceiptStatusUtils,
    MessageDirection,
    MessageReaction,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import type {ConversationId, MessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Base class for handling incoming or reflected outgoing delivery receipts, either from CSP or from
 * D2D.
 *
 * Concrete implementations:
 *
 * - CSP: {@link IncomingDeliveryReceiptTask}
 * - D2D: {@link ReflectedDeliveryReceiptTask}
 */
export abstract class DeliveryReceiptTaskBase<
    TTaskCodecHandleType extends PassiveTaskCodecHandle | ActiveTaskCodecHandle<'volatile'>,
> implements ComposableTask<TTaskCodecHandleType, void>
{
    protected readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        deliveryReceiptMessageId: MessageId,
        private readonly _conversationId: ConversationId,
        private readonly _validatedDeliveryReceipt: DeliveryReceipt.Type,
        private readonly _createdAt: Date,
    ) {
        const messageIdHex = u64ToHexLe(deliveryReceiptMessageId);
        this._log = _services.logging.logger(
            `network.protocol.task.delivery-receipt.${messageIdHex}`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: TTaskCodecHandleType): Promise<void> {
        // Validate message
        const statusName = CspE2eDeliveryReceiptStatusUtils.nameOf(
            this._validatedDeliveryReceipt.status,
        );
        this._log.info(
            `Processing delivery receipt of type ${statusName} for referenced message(s): ${this._validatedDeliveryReceipt.messageIds
                .map(u64ToHexLe)
                .join(', ')}`,
        );

        // Look up conversation
        const conversation = getConversationById(this._services, this._conversationId);
        if (conversation === undefined) {
            this._log.warn(`Conversation not found, aborting`);
            return;
        }

        // Process referenced messages
        for (const messageId of this._validatedDeliveryReceipt.messageIds) {
            const message = conversation.get().controller.getMessage(messageId)?.get();
            if (message === undefined) {
                this._log.info(`Message with ID ${u64ToHexLe(messageId)} not found, ignoring`);
                continue;
            }
            switch (this._validatedDeliveryReceipt.status) {
                case CspE2eDeliveryReceiptStatus.RECEIVED:
                    // Only outgoing messages can be marked as delivered. When receiving reflected
                    // delivery receipts of type RECEIVED referencing incoming messages (sent by the
                    // leader device towards another identity), this can be ignored.
                    if (message.ctx === MessageDirection.OUTBOUND) {
                        this._markAsDelivered(handle, message, this._createdAt);
                    }
                    break;
                case CspE2eDeliveryReceiptStatus.READ:
                    this._markAsRead(handle, message, this._createdAt);
                    break;
                case CspE2eDeliveryReceiptStatus.ACKNOWLEDGED:
                    this._reaction(handle, message, MessageReaction.ACKNOWLEDGE, this._createdAt);
                    break;
                case CspE2eDeliveryReceiptStatus.DECLINED:
                    this._reaction(handle, message, MessageReaction.DECLINE, this._createdAt);
                    break;
                default:
                    unreachable(this._validatedDeliveryReceipt.status);
            }
        }
    }

    /**
     * Mark the outgoing message as delivered.
     *
     * Note: This process may be async and may not yet have completed when this function returns.
     */
    protected abstract _markAsDelivered(
        handle: TTaskCodecHandleType,
        message: AnyOutboundMessageModel,
        deliveredAt: Date,
    ): void;

    /**
     * Mark the message as read.
     *
     * Note: This process may be async and may not yet have completed when this function returns.
     */
    protected abstract _markAsRead(
        handle: TTaskCodecHandleType,
        message: AnyMessageModel,
        readAt: Date,
    ): void;

    /**
     * Add a reaction to the message.
     *
     * Note: This process may be async and may not yet have completed when this function returns.
     */
    protected abstract _reaction(
        handle: TTaskCodecHandleType,
        message: AnyMessageModel,
        reaction: MessageReaction,
        reactedAt: Date,
    ): void;
}
