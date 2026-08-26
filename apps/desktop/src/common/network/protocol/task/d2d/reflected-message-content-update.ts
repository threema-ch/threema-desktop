import {u64ToHexLe} from '@threema/ts-utils/number/u64-to-hex-le';

import {MessageDirection, MessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Conversation} from '~/common/model/types/conversation';
import type {AnyNonDeletedMessageModelStore} from '~/common/model/types/message';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import type {
    ConversationId,
    DistributionListConversationId,
    IdentityString,
    MessageId,
} from '~/common/network/types';
import {assert, unreachable} from '~/common/utils/assert';

export class ReflectedMessageContentUpdateTask
    implements ComposableTask<PassiveTaskCodecHandle, void>
{
    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _messageId: MessageId,
        private readonly _conversationId: Exclude<ConversationId, DistributionListConversationId>,
        private readonly _update: {type: 'edit'; newText: string} | {type: 'delete'},
        private readonly _timeStamp: Date,
        private readonly _expectedMessageDirection: MessageDirection,
        private readonly _senderIdentity: IdentityString,
        private readonly _log: Logger,
    ) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const conversation = getConversationById(this._services, this._conversationId);
        if (conversation === undefined) {
            this._log.error(
                `Discarding ${this._expectedMessageDirection} message with Id ${this._messageId} because conversation was not found in database`,
            );
            return;
        }

        const messageStore = conversation.get().controller.getMessage(this._messageId);

        if (messageStore === undefined) {
            this._log.warn(
                `Discarding ${this._expectedMessageDirection} message with Id ${this._messageId} because it does not exist`,
            );
            return;
        }

        if (messageStore.type === MessageType.DELETED) {
            this._log.warn(
                `Discarding message update of ${u64ToHexLe(
                    messageStore.get().view.id,
                )} as the referenced message was already deleted.`,
            );
            return;
        }

        // If the sender is not the original sender of referred-message, discard the message and
        // abort these steps.
        const originalSenderIdentity =
            messageStore.ctx === MessageDirection.INBOUND
                ? messageStore.get().controller.sender().get().view.identity
                : this._services.device.identity.string;
        if (originalSenderIdentity !== this._senderIdentity) {
            this._log.warn(
                `Discarding message content update of type ${
                    this._update.type
                } for message ${u64ToHexLe(
                    this._messageId,
                )} as the original sender and the editor do not match`,
            );
            return;
        }

        switch (this._update.type) {
            case 'edit':
                this._editMessage(handle, messageStore, this._update.newText);
                return;
            case 'delete':
                this._deleteMessage(handle, conversation, messageStore.ctx);
                return;
            default:
                unreachable(this._update);
        }
    }

    private _deleteMessage(
        handle: PassiveTaskCodecHandle,
        conversation: ModelStore<Conversation>,
        direction: MessageDirection,
    ): void {
        assert(
            direction === this._expectedMessageDirection,
            `Expected ${direction} message to have direction ${this._expectedMessageDirection}`,
        );
        conversation
            .get()
            .controller.markMessageAsDeleted.fromSync(handle, this._messageId, this._timeStamp);
    }

    private _editMessage(
        handle: PassiveTaskCodecHandle,
        message: AnyNonDeletedMessageModelStore,
        newText: string,
    ): void {
        assert(
            message.ctx === this._expectedMessageDirection,
            `Expected ${message.ctx} message to have direction ${this._expectedMessageDirection}`,
        );
        message.get().controller.editMessage.fromSync(handle, {
            newText,
            lastEditedAt: this._timeStamp,
        });
    }
}
