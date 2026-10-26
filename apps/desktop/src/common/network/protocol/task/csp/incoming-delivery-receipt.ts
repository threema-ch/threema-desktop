import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {MessageDirection, MessageReaction, MessageType, ReceiverType} from '~/common/enum';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model';
import type {ActiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import {
    ensureEmojiReaction,
    type ConversationId,
    type IdentityString,
    type MessageId,
} from '~/common/network/types';
import {DEFAULT_THUMBS_DOWN_EMOJI, DEFAULT_THUMBS_UP_EMOJI} from '~/common/utils/emoji';
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
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyOutboundMessageModel,
        deliveredAt: Date,
    ): void {
        message.controller.delivered.fromRemote(handle, deliveredAt).catch(() => {
            // Ignore
        });
    }

    protected _markAsRead(
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyMessageModel,
        readAt: Date,
    ): void {
        if (message.ctx === MessageDirection.OUTBOUND) {
            message.controller.read.fromRemote(handle, readAt).catch(() => {
                // Ignore
            });
        } else {
            this._log.warn(
                `Received inbound delivery receipt of type READ for inbound message (ID ${message.ctx})`,
            );
        }
    }

    protected _reaction(
        handle: ActiveTaskCodecHandle<'volatile'>,
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

        // We need to ignore incoming single chat messages here, since for old-style reactions, this
        // is not allowed (and should never happen anyway).
        if (
            message.ctx === MessageDirection.INBOUND &&
            message.controller.conversation().get().controller.receiver().type ===
                ReceiverType.CONTACT
        ) {
            this._log.info(
                'Ignoring incoming delivery receipt for incoming message in single chat',
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
        // lead to an ack and a decline here. Therefore we remove the previous reaction of that kind
        // if it exists.
        message.controller.withdrawReaction.direct(invertedEmojiReaction, this._senderIdentity);
        message.controller.addReaction
            .fromRemote(handle, emojiReaction, reactedAt, this._senderIdentity)
            .catch(() => {
                // Ignore
            });
    }
}
