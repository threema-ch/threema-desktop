import type {Logger} from '~/common/logging';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import type {MessageId, ContactConversationId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

export class IncomingTypingIndicatorTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    protected readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        typingIndicatorMessageId: MessageId,
        private readonly _conversationId: ContactConversationId,
        private readonly _isTyping: boolean,
    ) {
        const messageIdHex = u64ToHexLe(typingIndicatorMessageId);
        this._log = _services.logging.logger(
            `network.protocol.task.incoming-typing-indicator.${messageIdHex}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // Look up conversation
        const conversation = getConversationById(this._services, this._conversationId);
        if (conversation === undefined) {
            this._log.warn(`Conversation not found, aborting`);
            return;
        }

        await conversation.get().controller.updateTyping.fromRemote(handle, this._isTyping);

        this._log.info(
            `Processing typing indicator with value ${this._isTyping} for conversation: ${conversation.ctx}`,
        );
    }
}
