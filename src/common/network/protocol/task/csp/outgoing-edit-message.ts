import {
    CspE2eGroupMessageUpdateType,
    CspE2eMessageUpdateType,
    MessageDirection,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Conversation} from '~/common/model';
import type {AnyReceiver} from '~/common/model/types/receiver';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTaskCodecHandle,
    type ActiveTask,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    OutgoingCspMessageTask,
    type ValidCspMessageTypeForReceiver,
} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {MessageId} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

export class OutgoingEditMessageTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'persistent'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _conversation: LocalModelStore<Conversation>,
        private readonly _messageId: MessageId,
        private readonly _lastEditedAt: Date,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._messageId);
        this._log = _services.logging.logger(`network.protocol.task.edit-message.${messageIdHex}`);
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const messageModelStore = this._conversation.get().controller.getMessage(this._messageId);
        if (messageModelStore === undefined) {
            this._log.error('Message does not exist anymore, aborting edit');
            return;
        }
        const messageModel = messageModelStore.get();
        assert(messageModel.ctx === MessageDirection.OUTBOUND);
        assert(
            messageModel.view.sentAt !== undefined,
            'Cannot edit a message that has not been sent yet',
        );
        if (
            Date.now() - messageModel.view.sentAt.getTime() >
            EDIT_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000
        ) {
            this._log.warn('Not editing message because grace period has expired');
            return;
        }

        // Encode message
        const encoder = protobuf.utils.encoder(protobuf.csp_e2e.EditMessage, {
            text:
                messageModel.type === MessageType.TEXT
                    ? messageModel.view.text
                    : messageModel.view.caption,
            messageId: intoUnsignedLong(messageModel.view.id),
        });

        // Message properties that apply both to 1:1 and group edit messages
        const commonMessageProperties = {
            messageId: randomMessageId(this._services.crypto),
            cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
            createdAt: this._lastEditedAt,
            allowUserProfileDistribution: false,
        };

        // Note: Here, we assume that a feature mask check and a check whether edit has actually changed anything have already happened.
        let task;
        switch (this._receiverModel.type) {
            case ReceiverType.CONTACT: {
                const messageProperties = {
                    type: CspE2eMessageUpdateType.EDIT_MESSAGE as ValidCspMessageTypeForReceiver<TReceiver>,
                    encoder,
                    ...commonMessageProperties,
                };
                task = new OutgoingCspMessageTask(
                    this._services,
                    this._receiverModel,
                    messageProperties,
                );
                break;
            }
            case ReceiverType.GROUP: {
                const groupEncoder = structbuf.bridge.encoder(
                    structbuf.csp.e2e.GroupMemberContainer,
                    {
                        groupId: this._receiverModel.view.groupId,
                        creatorIdentity: UTF8.encode(this._receiverModel.view.creatorIdentity),
                        innerData: encoder,
                    },
                );
                const messageProperties = {
                    type: CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE as ValidCspMessageTypeForReceiver<TReceiver>,
                    encoder: groupEncoder,
                    ...commonMessageProperties,
                };
                task = new OutgoingCspMessageTask(
                    this._services,
                    this._receiverModel,
                    messageProperties,
                );
                break;
            }
            case ReceiverType.DISTRIBUTION_LIST: {
                // TODO(DESK-597): Distribution lists
                this._log.warn('Distribution lists not implemented yet');
                return;
            }
            default:
                unreachable(this._receiverModel);
        }

        await task.run(handle);
    }
}
