import type {MessageReaction} from '~/common/enum';
import type {
    AnyMessageModel,
    AnyOutboundMessageModel,
    IdentityStringOrMe,
} from '~/common/model/types/message';
import type {PassiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import type {ConversationId, MessageId} from '~/common/network/types';

/**
 * Receive and process incoming or outgoing reflected delivery receipts.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedDeliveryReceiptTask extends DeliveryReceiptTaskBase<PassiveTaskCodecHandle> {
    public constructor(
        services: ServicesForTasks,
        deliveryReceiptMessageId: MessageId,
        conversationId: ConversationId,
        validatedDeliveryReceipt: DeliveryReceipt.Type,
        clampedCreatedAt: Date,
        private readonly _senderIdentity: IdentityStringOrMe,
    ) {
        super(
            services,
            deliveryReceiptMessageId,
            conversationId,
            validatedDeliveryReceipt,
            clampedCreatedAt,
        );
    }

    protected _markAsDelivered(
        handle: PassiveTaskCodecHandle,
        message: AnyOutboundMessageModel,
        deliveredAt: Date,
    ): void {
        message.controller.delivered.fromSync(deliveredAt);
    }

    protected _markAsRead(
        handle: PassiveTaskCodecHandle,
        message: AnyMessageModel,
        readAt: Date,
    ): void {
        message.controller.read.fromSync(readAt);
    }

    protected _reaction(
        handle: PassiveTaskCodecHandle,
        message: AnyMessageModel,
        reaction: MessageReaction,
        reactedAt: Date,
    ): void {
        message.controller.reaction.fromSync(reaction, reactedAt, this._senderIdentity);
    }
}
