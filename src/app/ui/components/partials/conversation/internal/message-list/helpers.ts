import type {Logger} from '~/common/logging';
import type {MessageId, StatusMessageId} from '~/common/network/types';
import {TIMER} from '~/common/utils/timer';

/**
 * This object tracks the messages currently visible in the viewport and debounces notifications
 * to the controller.
 */
export class Viewport {
    private static readonly _DEBOUNCE_MS = 100;

    private readonly _messages = new Set<MessageId | StatusMessageId>();

    private readonly _notifyController = TIMER.debounce(
        () => {
            this._setCurrentViewportMessagesHandler(new Set(this._messages)).catch(
                (error: unknown) =>
                    this._log.error(`Failed to set current viewport messages: ${error}`),
            );
        },
        Viewport._DEBOUNCE_MS,
        false,
    );

    public constructor(
        private readonly _log: Logger,
        private readonly _setCurrentViewportMessagesHandler: (
            ids: Set<MessageId | StatusMessageId>,
        ) => Promise<unknown>,
        initiallyVisibleMessageId?: MessageId | StatusMessageId,
    ) {
        if (initiallyVisibleMessageId !== undefined) {
            this._setCurrentViewportMessagesHandler(new Set([initiallyVisibleMessageId])).catch(
                (error: unknown) =>
                    this._log.error(`Failed to set initial viewport message: ${error}`),
            );
        }
    }

    /**
     * Mark a message ID as visible in the viewport.
     */
    public addMessage(id: MessageId | StatusMessageId): void {
        this._messages.add(id);
        this._notifyController();
    }

    /**
     * Remove a message ID from the visible messages in the viewport.
     */
    public deleteMessage(id: MessageId | StatusMessageId): void {
        this._messages.delete(id);
        this._notifyController();
    }
}
