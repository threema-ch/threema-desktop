import {MessageDirection, type MessageReaction} from '~/common/enum';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model';
import type {ActiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import type {ConversationId, MessageId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';

const EXPECTED_MESSAGE_DIRECTION = MessageDirection.OUTBOUND;

/**
 * Receive and process incoming delivery receipts from CSP.
 *
 * Processing may trigger side effects (e.g. reflection).
 */
export class IncomingDeliveryReceiptTask extends DeliveryReceiptTaskBase<
    ActiveTaskCodecHandle<'volatile'>
> {
    public constructor(
        services: ServicesForTasks,
        deliveryReceiptMessageId: MessageId,
        conversationId: ConversationId,
        validatedDeliveryReceipt: DeliveryReceipt.Type,
        clampedCreatedAt: Date,
    ) {
        super(
            services,
            deliveryReceiptMessageId,
            conversationId,
            validatedDeliveryReceipt,
            clampedCreatedAt,
            EXPECTED_MESSAGE_DIRECTION,
        );
    }

    protected _markAsDelivered(
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyOutboundMessageModel,
        deliveredAt: Date,
    ): void {
        void message.controller.delivered.fromRemote(handle, deliveredAt);
    }

    protected _markAsRead(
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyMessageModel,
        readAt: Date,
    ): void {
        assert(message.ctx === EXPECTED_MESSAGE_DIRECTION);
        void message.controller.read.fromRemote(handle, readAt);
    }

    protected _reaction(
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyMessageModel,
        reaction: MessageReaction,
        reactedAt: Date,
    ): void {
        assert(message.ctx === EXPECTED_MESSAGE_DIRECTION);
        void message.controller.reaction.fromRemote(handle, reaction, reactedAt);
    }
}
