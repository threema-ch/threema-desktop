import {
    CspE2eGroupMessageUpdateType,
    CspE2eMessageUpdateType,
    MessageDirection,
    MessageType,
    ReceiverType,
} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, Conversation, Group} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {UnifiedEditMessage} from '~/common/model/types/message';
import type {AnyReceiver} from '~/common/model/types/receiver';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTaskCodecHandle,
    type ActiveTask,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessageTask} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import type {MessageId} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {intoUnsignedLong, u64ToHexLe} from '~/common/utils/number';

export class OutgoingEditMessageTask<TReceiver extends AnyReceiver>
    implements ActiveTask<void, 'volatile'>
{
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = false;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _receiverModel: TReceiver,
        private readonly _conversation: ModelStore<Conversation>,
        private readonly _messageId: MessageId,
        private readonly _editedMessage: UnifiedEditMessage,
    ) {
        // Instantiate logger
        const messageIdHex = u64ToHexLe(this._messageId);
        this._log = _services.logging.logger(`network.protocol.task.edit-message.${messageIdHex}`);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const messageModelStore = this._conversation.get().controller.getMessage(this._messageId);
        if (messageModelStore === undefined) {
            this._log.error('Message does not exist anymore, aborting edit');
            return;
        }
        if (messageModelStore.type === MessageType.DELETED) {
            this._log.error('Message is of type deleted and cannot be edited');
            return;
        }
        const messageModel = messageModelStore.get();
        assert(messageModel.ctx === MessageDirection.OUTBOUND);
        assert(
            messageModel.view.sentAt !== undefined,
            'Cannot edit a message that has not been sent yet',
        );

        // Encode message
        const encoder = protobuf.utils.encoder(protobuf.csp_e2e.EditMessage, {
            text: this._editedMessage.newText,
            messageId: intoUnsignedLong(messageModel.view.id),
        });

        // Message properties that apply both to 1:1 and group edit messages
        const commonMessageProperties = {
            messageId: randomMessageId(this._services.crypto),
            cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
            createdAt: this._editedMessage.lastEditedAt,
            allowUserProfileDistribution: false,
        };

        // Note: Here, we assume that a feature mask check and a check whether edit has actually changed anything have already happened.
        let task;
        switch (this._receiverModel.type) {
            case ReceiverType.CONTACT: {
                const messageProperties = {
                    type: CspE2eMessageUpdateType.EDIT_MESSAGE,
                    encoder,
                    ...commonMessageProperties,
                } as const;

                task = new OutgoingCspMessageTask<
                    protobuf.csp_e2e.EditMessageEncodable,
                    Contact,
                    CspE2eMessageUpdateType.EDIT_MESSAGE
                >(this._services, this._receiverModel, messageProperties);

                break;
            }
            case ReceiverType.GROUP: {
                const groupEncoder = structbuf.bridge.encoder(
                    structbuf.csp.e2e.GroupMemberContainer,
                    {
                        groupId: this._receiverModel.view.groupId,
                        creatorIdentity: UTF8.encode(
                            getIdentityString(
                                this._services.device,
                                this._receiverModel.view.creator,
                            ),
                        ),
                        innerData: encoder,
                    },
                );
                const messageProperties = {
                    type: CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE,
                    encoder: groupEncoder,
                    ...commonMessageProperties,
                } as const;

                task = new OutgoingCspMessageTask<
                    structbuf.csp.e2e.GroupMemberContainerEncodable,
                    Group,
                    CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE
                >(this._services, this._receiverModel, messageProperties);

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
