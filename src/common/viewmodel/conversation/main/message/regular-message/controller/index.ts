import {MessageDirection, MessageReaction, MessageType} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {AnyNonDeletedMessageModelStore} from '~/common/model/types/message';
import {ensureEmojiReaction} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {
    DEFAULT_THUMBS_DOWN_EMOJI,
    DEFAULT_THUMBS_UP_EMOJI,
    type SingleUnicodeEmoji,
} from '~/common/utils/emoji';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import type {ServicesForViewModel} from '~/common/viewmodel';

export interface IConversationRegularMessageViewModelController extends ProxyMarked {
    /**
     * React to a message using the "acknowledge" reaction.
     */
    readonly acknowledge: () => Promise<void>;
    /**
     * React to a message using the "decline" reaction.
     */
    readonly decline: () => Promise<void>;

    /**
     * Apply an emoji reaction.
     */
    readonly applyEmojiReaction: (emoji: SingleUnicodeEmoji) => Promise<void>;

    /**
     * Withdraw an emoji reaction.
     */
    readonly withdrawEmojiReaction: (emoji: SingleUnicodeEmoji) => Promise<void>;
    /**
     * Edit the message text/caption content.
     */
    readonly edit: (newText: string, editedAt: Date) => Promise<void>;
    /**
     * Fetches and returns the full blob data of a file or media message, triggering a download if
     * necessary.
     */
    readonly getBlob: () => Promise<FileBytesAndMediaType | undefined>;
}

export class ConversationRegularMessageViewModelController
    implements IConversationRegularMessageViewModelController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(
        private readonly _services: Pick<ServicesForViewModel, 'model'>,
        private readonly _message: AnyNonDeletedMessageModelStore,
    ) {}

    public async acknowledge(): Promise<void> {
        return await this._applyDeprecatedMessageReaction(MessageReaction.ACKNOWLEDGE);
    }

    public async decline(): Promise<void> {
        return await this._applyDeprecatedMessageReaction(MessageReaction.DECLINE);
    }

    public async applyEmojiReaction(emoji: SingleUnicodeEmoji): Promise<void> {
        return await this._message
            .get()
            .controller.addReaction.fromLocal(ensureEmojiReaction(emoji), new Date());
    }
    public async withdrawEmojiReaction(emoji: SingleUnicodeEmoji): Promise<void> {
        return await this._message
            .get()
            .controller.withdrawReaction.fromLocal(ensureEmojiReaction(emoji));
    }
    public async getBlob(): Promise<FileBytesAndMediaType | undefined> {
        switch (this._message.type) {
            case MessageType.FILE:
            case MessageType.IMAGE:
            case MessageType.VIDEO:
            case MessageType.AUDIO:
                return await this._message.get().controller.blob();

            case MessageType.TEXT:
                return undefined;

            default:
                return unreachable(this._message);
        }
    }

    public async edit(newText: string, editedAt: Date): Promise<void> {
        return await this._applyEdit(newText, editedAt);
    }

    private async _applyEdit(newText: string, editedAt: Date): Promise<void> {
        const messageModel = this._message.get();
        if (messageModel.ctx !== MessageDirection.OUTBOUND) {
            return;
        }

        await messageModel.controller.editMessage.fromLocal({
            newText,
            lastEditedAt: editedAt,
        });
    }

    private async _applyDeprecatedMessageReaction(reaction: MessageReaction): Promise<void> {
        const messageModel = this._message.get();

        switch (reaction) {
            case MessageReaction.ACKNOWLEDGE:
                messageModel.controller.withdrawReaction.direct(
                    ensureEmojiReaction(DEFAULT_THUMBS_DOWN_EMOJI),
                    this._services.model.user.identity,
                );
                return await messageModel.controller.addReaction.fromLocal(
                    ensureEmojiReaction(DEFAULT_THUMBS_UP_EMOJI),
                    new Date(),
                );

            case MessageReaction.DECLINE:
                messageModel.controller.withdrawReaction.direct(
                    ensureEmojiReaction(DEFAULT_THUMBS_UP_EMOJI),
                    this._services.model.user.identity,
                );
                return await messageModel.controller.addReaction.fromLocal(
                    ensureEmojiReaction(DEFAULT_THUMBS_DOWN_EMOJI),
                    new Date(),
                );

            default:
                return unreachable(reaction);
        }
    }
}
