import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import {debounce} from '~/common/utils/timer';

/**
 * This object tracks the messages currently visible in the viewport and debounces notifications
 * to the controller.
 */
export class Viewport {
    private static readonly _DEBOUNCE_MS = 100;

    private readonly _messages = new Set<MessageId>();

    private readonly _notifyController = debounce(
        () => {
            this._setCurrentViewportMessagesHandler(new Set(this._messages)).catch((error) =>
                this._log.error(`Failed to set current viewport messages: ${error}`),
            );
        },
        Viewport._DEBOUNCE_MS,
        false,
    );

    public constructor(
        private readonly _log: Logger,
        private readonly _setCurrentViewportMessagesHandler: (
            ids: Set<MessageId>,
        ) => Promise<unknown>,
        initiallyVisibleMessageId?: MessageId,
    ) {
        if (initiallyVisibleMessageId !== undefined) {
            this._setCurrentViewportMessagesHandler(new Set([initiallyVisibleMessageId])).catch(
                (error) => this._log.error(`Failed to set initial viewport message: ${error}`),
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
