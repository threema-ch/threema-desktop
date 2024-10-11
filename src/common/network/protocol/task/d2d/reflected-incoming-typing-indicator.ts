import type {Logger} from '~/common/logging';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task/';
import {getConversationById} from '~/common/network/protocol/task/message-processing-helpers';
import type {ContactConversationId, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

export class ReflectedIncomingTypingIndicatorTask
    implements ComposableTask<PassiveTaskCodecHandle, void>
{
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        typingIndicatorMessageId: MessageId,
        private readonly _conversationId: ContactConversationId,
        private readonly _isTyping: boolean,
    ) {
        const messageIdHex = u64ToHexLe(typingIndicatorMessageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-incoming-typing-indicator.${messageIdHex}`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        // Look up conversation
        const conversation = getConversationById(this._services, this._conversationId);
        if (conversation === undefined) {
            this._log.warn(`Conversation not found, aborting`);
            return;
        }

        conversation.get().controller.updateTyping.fromSync(handle, this._isTyping);

        this._log.info(
            `Updated typing indicator with value ${this._isTyping} for conversation: ${conversation.ctx}`,
        );
    }
}
