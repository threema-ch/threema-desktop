import {type Conversation, type SetOfAnyLocalMessageModelStore} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import {type IViewModelBackend} from '~/common/viewmodel';
import {type ConversationMessage} from '~/common/viewmodel/conversation-message';

export type ConversationMessageSetStore = LocalDerivedSetStore<
    SetOfAnyLocalMessageModelStore,
    ConversationMessage
>;

/**
 * Get a SetStore that contains a ConversationPreview for a receiver.
 */
export function getConversationMessageSetStore(
    viewModelBackend: IViewModelBackend,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetStore {
    const conversationModel = conversation.get();
    const messageSetStore = conversationModel.controller.getAllMessages();

    return new LocalDerivedSetStore(messageSetStore, (store) =>
        viewModelBackend.conversationMessage(conversation, store.get().view.id, store),
    );
}
