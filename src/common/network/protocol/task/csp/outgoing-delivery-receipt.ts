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
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessageTask} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {type MessageId} from '~/common/network/types';
import {groupArray} from '~/common/utils/array';
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

    /**
     * Send and reflect a delivery receipt for one or more messages.
     *
     * Message IDs are processed in groups of up to 512 IDs, so an arbitrary number of message IDs
     * may be passed to this task.
     *
     * @param _services Task Services
     * @param _contact Contact to which to send the delivery receipt to.
     * @param _status Message status to be applied on one or more messages.
     * @param _createdAt The timestamp that will be used as `createdAt` in the outgoing delivery
     *   receipt.
     * @param _messageIds Refers to one or more messages whose status should be updated.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _contact: LocalModelStore<Contact>,
        private readonly _status: Exclude<
            CspE2eDeliveryReceiptStatus,
            CspE2eDeliveryReceiptStatus.RECEIVED
        >,
        private readonly _createdAt: Date,
        private readonly _messageIds: MessageId[],
    ) {
        this._log = _services.logging.logger(`network.protocol.task.out-delivery-receipt`);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const contactModel = this._contact.get();

        // Common message properties
        const type = CspE2eStatusUpdateType.DELIVERY_RECEIPT;
        const cspMessageFlags = CspMessageFlags.none();
        const createdAt = this._createdAt;
        const allowUserProfileDistribution = isReaction(this._status);

        // Send delivery receipts in groups of up to 512 message IDs
        for (const group of groupArray(this._messageIds, 512)) {
            this._log.info(
                `Sending a delivery receipt of type ${CspE2eDeliveryReceiptStatusUtils.nameOf(
                    this._status,
                )} for ${group.length} message(s): ${group
                    .map((messageId) => u64ToHexLe(messageId))
                    .join(',')}`,
            );

            // Delegate reflecting and sending to the OutgoingCspMessageTask
            const messageTask = new OutgoingCspMessageTask(this._services, contactModel, {
                type,
                encoder: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                    messageIds: group,
                    status: this._status,
                }),
                messageId: randomMessageId(this._services.crypto),
                cspMessageFlags,
                createdAt,
                allowUserProfileDistribution,
            });
            await messageTask.run(handle);
        }
    }
}
