import {MessageType, type MessageReaction} from '~/common/enum';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model/types/message';
import type {PassiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import type {ConversationId, IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

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
        private readonly _senderIdentity: IdentityString,
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
        message.controller.delivered.fromSync(handle, deliveredAt);
    }

    protected _markAsRead(
        handle: PassiveTaskCodecHandle,
        message: AnyMessageModel,
        readAt: Date,
    ): void {
        message.controller.read.fromSync(handle, readAt);
    }

    protected _reaction(
        handle: PassiveTaskCodecHandle,
        message: AnyMessageModel,
        reaction: MessageReaction,
        reactedAt: Date,
    ): void {
        if (message.type === MessageType.DELETED) {
            this._log.warn(
                `Skipping message update for ${u64ToHexLe(
                    message.view.id,
                )} because it was already deleted`,
            );
            return;
        }
        message.controller.reaction.fromSync(handle, reaction, reactedAt, this._senderIdentity);
    }
}
