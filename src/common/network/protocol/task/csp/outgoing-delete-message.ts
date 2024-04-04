import {CspE2eGroupMessageUpdateType, CspE2eMessageUpdateType, ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyReceiver} from '~/common/model';
import type {OutboundDeletedMessageModelStore} from '~/common/model/message/deleted-message';
import * as protobuf from '~/common/network/protobuf';
import {DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    OutgoingCspMessageTask,
    type ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {assert} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

export class OutgoingDeleteMessageTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _messageModelStore: OutboundDeletedMessageModelStore,
        private readonly _deletedAt: Date,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._messageModelStore.get().view.id);
        this._log = _services.logging.logger(`network.protocol.task.out-message.${messageIdHex}`);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const messageModel = this._messageModelStore.get();
        assert(
            messageModel.view.sentAt !== undefined,
            'Cannot delete a message that has not been sent yet',
        );
        if (
            Date.now() - messageModel.view.sentAt.getTime() >
            DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000
        ) {
            this._log.warn('Not deleting message because grace period has expired');
            return;
        }

        const longMessageId = intoUnsignedLong(messageModel.view.id);
        const encoder = protobuf.utils.encoder(protobuf.csp_e2e.DeleteMessage, {
            messageId: longMessageId,
        });

        const deleteMessageWrapperId = randomMessageId(this._services.crypto);

        // Note: Here, we assume that a feature mask check and a check whether edit has actually changed anything have already happened.
        let task;
        if (this._receiverModel.type === ReceiverType.CONTACT) {
            const messageProperties = {
                type: CspE2eMessageUpdateType.DELETE_MESSAGE as ValidCspMessageTypeForReceiver<TReceiver>,
                encoder,
                cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
                messageId: deleteMessageWrapperId,
                createdAt: this._deletedAt,
                allowUserProfileDistribution: false,
            };

            task = new OutgoingCspMessageTask(
                this._services,
                this._receiverModel,
                messageProperties,
            );
        } else if (this._receiverModel.type === ReceiverType.GROUP) {
            const groupEncoder = structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
                groupId: this._receiverModel.view.groupId,
                creatorIdentity: UTF8.encode(this._receiverModel.view.creatorIdentity),
                innerData: encoder,
            });
            const messageProperties = {
                type: CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE as ValidCspMessageTypeForReceiver<TReceiver>,
                encoder: groupEncoder,
                cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
                messageId: deleteMessageWrapperId,
                createdAt: this._deletedAt,
                allowUserProfileDistribution: false,
            } as const;

            task = new OutgoingCspMessageTask(
                this._services,
                this._receiverModel,
                messageProperties,
            );

            // TODO(DESK-597)
        } else {
            this._log.warn('Distribution Lists not implemented yet');
            return;
        }

        await task.run(handle);
    }
}
