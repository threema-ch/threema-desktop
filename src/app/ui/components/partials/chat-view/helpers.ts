import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import type {Remote} from '~/common/utils/endpoint';
import {debounce} from '~/common/utils/timer';
import type {ConversationMessageSetViewModel} from '~/common/viewmodel/conversation-message-set';

/**
 * This object tracks the messages currently visible in the viewport and debounces notifications
 * to the controller.
 */
export class Viewport {
    private static readonly _DEBOUNCE_MS = 100;

    private readonly _messages = new Set<MessageId>();

    private readonly _notifyController = debounce(
        () => {
            this._messageSetViewModelController
                .setCurrentViewportMessages(new Set(this._messages))
                .catch((error) =>
                    this._log.error(`Failed to set current viewport messages: ${error}`),
                );
        },
        Viewport._DEBOUNCE_MS,
        false,
    );

    public constructor(
        private readonly _log: Logger,
        private readonly _messageSetViewModelController: Remote<
            ConversationMessageSetViewModel['controller']
        >,
        initiallyVisibleMessageId?: MessageId,
    ) {
        if (initiallyVisibleMessageId !== undefined) {
            this._messageSetViewModelController
                .setCurrentViewportMessages(new Set([initiallyVisibleMessageId]))
                .catch((error) =>
                    this._log.error(`Failed to set initial viewport message: ${error}`),
                );
        }
    }

    /**
     * Mark a message ID as visible in the viewport.
     */
    public addMessage(id: MessageId): void {
        this._messages.add(id);
        this._notifyController();
    }

    /**
     * Remove a message ID from the visible messages in the viewport.
     */
    public deleteMessage(id: MessageId): void {
        this._messages.delete(id);
        this._notifyController();
    }
}
