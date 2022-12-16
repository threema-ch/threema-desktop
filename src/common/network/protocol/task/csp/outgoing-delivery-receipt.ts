import {
    CspE2eDeliveryReceiptStatus,
    CspE2eDeliveryReceiptStatusUtils,
    CspE2eStatusUpdateType,
} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Contact} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
    ACTIVE_TASK,
} from '~/common/network/protocol/task';
import {
    type ValidCspMessageTypeForReceiver,
    OutgoingCspMessageTask,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {type MessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Return whether or not {@link status} is a reaction.
 */
function isReaction(status: CspE2eDeliveryReceiptStatus): boolean {
    switch (status) {
        case CspE2eDeliveryReceiptStatus.RECEIVED:
        case CspE2eDeliveryReceiptStatus.READ:
            return false;
        case CspE2eDeliveryReceiptStatus.ACKNOWLEDGED:
        case CspE2eDeliveryReceiptStatus.DECLINED:
            return true;
        default:
            return unreachable(status);
    }
}

export class OutgoingDeliveryReceiptTask implements ActiveTask<void, 'persistent'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;
    private readonly _log: Logger;

    private readonly _messageTask: OutgoingCspMessageTask<
        structbuf.csp.e2e.DeliveryReceiptEncodable,
        Contact,
        ValidCspMessageTypeForReceiver<Contact>
    >;

    /**
     * Send and reflect a delivery receipt.
     *
     * @param _services Task Services
     * @param _contact Contact to which to send the delivery receipt to.
     * @param _status Message status to be applied on one or more messages.
     * @param createdAt The timestamp that will be used as `createdAt` in the outgoing delivery receipt.
     * @param messageIds Refers to one or more messages whose status should be updated.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _contact: LocalModelStore<Contact>,
        private readonly _status: Exclude<
            CspE2eDeliveryReceiptStatus,
            CspE2eDeliveryReceiptStatus.RECEIVED
        >,
        createdAt: Date,
        private readonly _messageIds: MessageId[],
    ) {
        this._log = _services.logging.logger(`network.protocol.task.out-delivery-receipt`);

        const properties = {
            type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
            encoder: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                messageIds: _messageIds,
                status: this._status,
            }),
            cspMessageFlags: CspMessageFlags.none(),
            messageId: randomMessageId(this._services.crypto),
            createdAt,
            allowUserProfileDistribution: isReaction(this._status),
        } as const;

        // Delegate reflecting and sending to the OutgoingCspMessageTask
        this._messageTask = new OutgoingCspMessageTask(
            this._services,
            this._contact.get(),
            properties,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        this._log.info(
            `Sending a delivery receipt of type ${CspE2eDeliveryReceiptStatusUtils.nameOf(
                this._status,
            )} for message(s) ${this._messageIds
                .map((messageId) => u64ToHexLe(messageId))
                .join(',')}`,
        );

        await this._messageTask.run(handle);
    }
}
