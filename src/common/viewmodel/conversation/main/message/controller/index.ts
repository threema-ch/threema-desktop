import {MessageDirection, MessageReaction, MessageType} from '~/common/enum';
import type {AnyMessageModelStore} from '~/common/model';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';

export interface IConversationMessageViewModelController extends ProxyMarked {
    /**
     * React to a message using the "acknowledge" reaction.
     */
    readonly acknowledge: () => Promise<void>;
    /**
     * React to a message using the "decline" reaction.
     */
    readonly decline: () => Promise<void>;
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

export class ConversationMessageViewModelController
    implements IConversationMessageViewModelController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _message: AnyMessageModelStore) {}

    public async acknowledge(): Promise<void> {
        return await this._applyReaction(MessageReaction.ACKNOWLEDGE);
    }

    public async decline(): Promise<void> {
        return await this._applyReaction(MessageReaction.DECLINE);
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

    // eslint-disable-next-line @typescript-eslint/require-await
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

    private async _applyReaction(reaction: MessageReaction): Promise<void> {
        const messageModel = this._message.get();

        switch (reaction) {
            case MessageReaction.ACKNOWLEDGE:
                return await messageModel.controller.reaction.fromLocal(
                    MessageReaction.ACKNOWLEDGE,
                    new Date(),
                );

            case MessageReaction.DECLINE:
                return await messageModel.controller.reaction.fromLocal(
                    MessageReaction.DECLINE,
                    new Date(),
                );

            default:
                return unreachable(reaction);
        }
    }
}
