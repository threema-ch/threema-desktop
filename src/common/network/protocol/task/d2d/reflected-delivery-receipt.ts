import {type MessageReaction} from '~/common/enum';
import {type AnyMessageModel, type AnyOutboundMessageModel} from '~/common/model/types/message';
import {type PassiveTaskCodecHandle} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';

/**
 * Receive and process incoming or outgoing reflected delivery receipts.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedDeliveryReceiptTask extends DeliveryReceiptTaskBase<PassiveTaskCodecHandle> {
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
        message.controller.reaction.fromSync(reaction, reactedAt);
    }
}
