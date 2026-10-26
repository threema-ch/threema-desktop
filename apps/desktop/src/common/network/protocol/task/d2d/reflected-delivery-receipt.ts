import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {MessageReaction, MessageType} from '~/common/enum';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model/types/message';
import type {PassiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import {
    type ConversationId,
    type IdentityString,
    type MessageId,
    ensureEmojiReaction,
} from '~/common/network/types';
import {DEFAULT_THUMBS_DOWN_EMOJI, DEFAULT_THUMBS_UP_EMOJI} from '~/common/utils/emoji';
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

        const emojiReaction = ensureEmojiReaction(
            reaction === MessageReaction.ACKNOWLEDGE
                ? DEFAULT_THUMBS_UP_EMOJI
                : DEFAULT_THUMBS_DOWN_EMOJI,
        );
        const invertedEmojiReaction = ensureEmojiReaction(
            reaction === MessageReaction.DECLINE
                ? DEFAULT_THUMBS_UP_EMOJI
                : DEFAULT_THUMBS_DOWN_EMOJI,
        );

        // We need special handling here so that switching between acks/decs in legacy code does not
        // lead to an ack and a decline here. Therefore we remove the previous reaction of that kind if it exists.
        message.controller.withdrawReaction.direct(invertedEmojiReaction, this._senderIdentity);

        message.controller.addReaction.fromSync(
            handle,
            emojiReaction,
            reactedAt,
            this._senderIdentity,
        );
    }
}
