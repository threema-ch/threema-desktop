import {MessageDirection, MessageType, ReceiverType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import { getIdentityString } from '~/common/model/contact';
import type {Conversation} from '~/common/model/types/conversation';
import type {GroupCreator} from '~/common/model/types/group';
import type {AnyInboundNonDeletedMessageModelStore} from '~/common/model/types/message';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {ContactOrInit} from '~/common/network/protocol/task/csp/incoming-message';
import type {
    ConversationId,
    DistributionListConversationId,
    MessageId,
} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process incoming edit and delete messages from CSP.
 */
export class IncomingMessageContentUpdateTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _messageId: MessageId,
        private readonly _conversationId: Exclude<ConversationId, DistributionListConversationId>,
        private readonly _update: {type: 'edit'; newText: string} | {type: 'delete'},
        private readonly _timeStamp: Date,
        private readonly _contactOrInit: ContactOrInit,
        private readonly _log: Logger,
    ) {}

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const {model} = this._services;

        // 1. Lookup the message with message_id originally sent by the sender within the
        //    associated conversation and let message be the result.
        assert(
            this._contactOrInit instanceof LocalModelStore,
            'Contact should have been created by IncomingMessageTask, but was not',
        );
        const senderContactModel = this._contactOrInit.get();
        let conversation: LocalModelStore<Conversation>;
        switch (this._conversationId.type) {
            case ReceiverType.CONTACT:
                conversation = senderContactModel.controller.conversation();
                break;
            case ReceiverType.GROUP:
                {
                    const creator: GroupCreator = getIdentityString(
                        this._services.device,
                        this._conversationId.creatorIdentity,
                    );
                    const group = model.groups.getByGroupIdAndCreator(
                        this._conversationId.groupId,
                        creator,
                    );
                    if (group === undefined) {
                        this._log.warn(
                            `Discarding conversation message update of type ${this._update.type} for message ${u64ToHexLe(
                                this._messageId,
                            )} as the referenced group does not exist`,
                        );
                        return;
                    }
                    conversation = group.get().controller.conversation();
                }
                break;
            default:
                unreachable(this._conversationId);
        }
        const message = conversation.get().controller.getMessage(this._messageId);

        // 2. If `message` is not defined or the sender is not the original sender of
        //    `message`, discard the message and abort these steps.
        if (message === undefined) {
            this._log.warn(
                `Discarding conversation message update of type ${this._update.type} for message ${u64ToHexLe(
                    this._messageId,
                )} as the target message was not found`,
            );
            return;
        }
        if (message.ctx !== MessageDirection.INBOUND) {
            this._log.warn(
                `Discarding conversation message update of type ${this._update.type} for message ${u64ToHexLe(
                    this._messageId,
                )} as the target message was not inbound`,
            );
            return;
        }
        const messageSender = message.get().controller.sender();
        if (messageSender.ctx !== this._contactOrInit.ctx) {
            this._log.warn(
                `Discarding conversation message update of type ${this._update.type} for message ${u64ToHexLe(
                    this._messageId,
                )} as the original sender and the editor do not match`,
            );
            return;
        }

        // 3. If `message` is not editable/deletable (see the associated _Edit applies to_, _Delete applies to_
        // property), discard the message and abort these steps.
        if (message.type === MessageType.DELETED) {
            this._log.warn(
                `Discarding conversation message update of type ${this._update.type} for message ${u64ToHexLe(
                    this._messageId,
                )} as the referenced message was already deleted.`,
            );
            return;
        }

        switch (this._update.type) {
            case 'edit':
                await this._editMessage(handle, message, this._update.newText);
                return;
            case 'delete':
                await this._deleteMessage(handle, conversation);
                return;
            default:
                unreachable(this._update);
        }
    }

    private async _deleteMessage(
        handle: ActiveTaskCodecHandle<'volatile'>,
        conversation: LocalModelStore<Conversation>,
    ): Promise<void> {
        await conversation
            .get()
            .controller.markMessageAsDeleted.fromRemote(handle, this._messageId, this._timeStamp);
    }

    private async _editMessage(
        handle: ActiveTaskCodecHandle<'volatile'>,
        message: AnyInboundNonDeletedMessageModelStore,
        newText: string,
    ): Promise<void> {
        await message.get().controller.editMessage.fromRemote(handle, {
            newText,
            lastEditedAt: this._timeStamp,
        });
    }
}
