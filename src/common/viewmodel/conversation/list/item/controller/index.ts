import {ConversationVisibility} from '~/common/enum';
import {TRANSFER_HANDLER} from '~/common/index';
import type {ConversationModelStore} from '~/common/model/conversation';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';

export interface IConversationListItemViewModelController extends ProxyMarked {
    /**
     * Toggle archived state of the conversation.
     */
    readonly toggleArchived: () => Promise<void>;
    /**
     * Clear the conversation by deleting all its contents (e.g., messages, etc.).
     */
    readonly clear: () => Promise<void>;
    /**
     * Delete the conversation (i.e., clear and hide it).
     */
    readonly delete: () => Promise<void>;
    /**
     * Toggle pinned state of the conversation.
     */
    readonly togglePinned: () => Promise<void>;
}

export class ConversationListItemViewModelController
    implements IConversationListItemViewModelController
{
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    public constructor(private readonly _conversation: ConversationModelStore) {}

    /** @inheritdoc */
    public async toggleArchived(): Promise<void> {
        const conversationModel = this._conversation.get();

        if (conversationModel.view.visibility === ConversationVisibility.ARCHIVED) {
            return await conversationModel.controller.updateVisibility.fromLocal(
                ConversationVisibility.SHOW,
            );
        }

        return await conversationModel.controller.updateVisibility.fromLocal(
            ConversationVisibility.ARCHIVED,
        );
    }

    /** @inheritdoc */
    public async clear(): Promise<void> {
        await this._conversation.get().controller.removeAllStatusMessages.fromLocal();
        return await this._conversation.get().controller.removeAllMessages.fromLocal();
    }

    /** @inheritdoc */
    public async delete(): Promise<void> {
        // Clear all conversation contents.
        await this.clear();

        // Soft-delete the conversation (i.e., the conversation is kept in the database but is not
        // shown in the conversation list anymore).
        return this._conversation.get().controller.update.fromSync({lastUpdate: undefined});
    }

    /** @inheritdoc */
    public async togglePinned(): Promise<void> {
        const conversationModel = this._conversation.get();

        if (conversationModel.view.visibility === ConversationVisibility.PINNED) {
            return await conversationModel.controller.updateVisibility.fromLocal(
                ConversationVisibility.SHOW,
            );
        }

        return await conversationModel.controller.updateVisibility.fromLocal(
            ConversationVisibility.PINNED,
        );
    }
}
