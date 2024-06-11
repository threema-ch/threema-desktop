import {
    CspE2eDeliveryReceiptStatus,
    CspE2eDeliveryReceiptStatusUtils,
    CspE2eGroupStatusUpdateType,
    CspE2eStatusUpdateType,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver, Contact, Group} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    type MessageProperties,
    OutgoingCspMessageTask,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {
    DeliveryReceiptEncodable,
    GroupMemberContainerEncodable,
} from '~/common/network/structbuf/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {chunk} from '~/common/utils/array';
import {unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
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

export class OutgoingDeliveryReceiptTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
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
     * @param _receiver Receiver to which to send the delivery receipt to.
     * @param _status Message status to be applied on one or more messages.
     * @param _createdAt The timestamp that will be used as `createdAt` in the outgoing delivery
     *   receipt.
     * @param _messageIds Refers to one or more messages whose status should be updated.
     */
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiver: TReceiver,
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
        // Send delivery receipts in groups of up to 512 message IDs
        for (const group of chunk(this._messageIds, 512)) {
            this._log.info(
                `Sending a delivery receipt of type ${CspE2eDeliveryReceiptStatusUtils.nameOf(
                    this._status,
                )} for ${group.length} message(s): ${group
                    .map((messageId) => u64ToHexLe(messageId))
                    .join(',')}`,
            );
            switch (this._receiver.type) {
                case ReceiverType.CONTACT:
                    await this._sendContactDeliveryReceipt(this._receiver, group, handle);
                    break;
                case ReceiverType.GROUP:
                    await this._sendGroupDeliveryReceipt(this._receiver, group, handle);
                    break;
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-237)
                    return;
                default:
                    unreachable(this._receiver);
            }
        }
    }

    private async _sendContactDeliveryReceipt(
        contact: Contact,
        messageIds: MessageId[],
        handle: ActiveTaskCodecHandle<'persistent'>,
    ): Promise<void> {
        const messageProperties: MessageProperties<
            DeliveryReceiptEncodable,
            CspE2eStatusUpdateType
        > = {
            type: CspE2eStatusUpdateType.DELIVERY_RECEIPT,
            encoder: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                messageIds,
                status: this._status,
            }),
            cspMessageFlags: CspMessageFlags.none(),
            messageId: randomMessageId(this._services.crypto),
            createdAt: this._createdAt,
            allowUserProfileDistribution: isReaction(this._status),
        } as const;

        const messageTask = new OutgoingCspMessageTask<
            DeliveryReceiptEncodable,
            Contact,
            CspE2eStatusUpdateType
        >(this._services, contact, messageProperties);
        await messageTask.run(handle);
    }

    private async _sendGroupDeliveryReceipt(
        group: Group,
        messageIds: MessageId[],
        handle: ActiveTaskCodecHandle<'persistent'>,
    ): Promise<void> {
        const messageProperties: MessageProperties<
            GroupMemberContainerEncodable,
            CspE2eGroupStatusUpdateType
        > = {
            type: CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT,
            encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                groupId: group.view.groupId,
                creatorIdentity: UTF8.encode(
                    getIdentityString(this._services.device, group.view.creator),
                ),
                innerData: structbuf.bridge.encoder(structbuf.csp.e2e.DeliveryReceipt, {
                    messageIds,
                    status: this._status,
                }),
            }),
            cspMessageFlags: CspMessageFlags.none(),
            messageId: randomMessageId(this._services.crypto),
            createdAt: this._createdAt,
            allowUserProfileDistribution: isReaction(this._status),
        };

        const messageTask = new OutgoingCspMessageTask<
            GroupMemberContainerEncodable,
            Group,
            CspE2eGroupStatusUpdateType
        >(this._services, group, messageProperties);
        await messageTask.run(handle);
    }
}
