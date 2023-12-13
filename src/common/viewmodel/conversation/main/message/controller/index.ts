import {MessageReaction, MessageType} from '~/common/enum';
import type {AnyMessageModelStore} from '~/common/model';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {PROXY_HANDLER, type ProxyMarked, TRANSFER_HANDLER} from '~/common/utils/endpoint';

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
     * Fetches and returns the full blob data of a file or media message, triggering a download if
     * necessary.
     */
    readonly getBlob: () => Promise<ReadonlyUint8Array | undefined>;
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

    public async getBlob(): Promise<ReadonlyUint8Array | undefined> {
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
