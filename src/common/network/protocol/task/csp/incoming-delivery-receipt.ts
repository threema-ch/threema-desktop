import {MessageDirection, MessageType, type MessageReaction} from '~/common/enum';
import type {AnyMessageModel, AnyOutboundMessageModel} from '~/common/model';
import type {ActiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {DeliveryReceiptTaskBase} from '~/common/network/protocol/task/common/delivery-receipt';
import type {DeliveryReceipt} from '~/common/network/structbuf/validate/csp/e2e';
import type {ConversationId, IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

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
        message.controller.reaction
            .fromRemote(handle, reaction, reactedAt, this._senderIdentity)
            .catch(() => {
                // Ignore
            });
    }
}
