import type {Conversation} from '~/common/model';
import type {SetOfAnyLocalMessageModelStore} from '~/common/model/types/message';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository} from '~/common/viewmodel';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';

export type ConversationMessageSetStore = LocalDerivedSetStore<
    SetOfAnyLocalMessageModelStore,
    ConversationMessageViewModelBundle
>;

/**
 * Get a SetStore that contains a ConversationPreview for a receiver.
 */
export function getConversationMessageSetStore(
    viewModelRepository: IViewModelRepository,
    conversation: LocalModelStore<Conversation>,
): ConversationMessageSetStore {
    const conversationModel = conversation.get();
    const messageSetStore = conversationModel.controller.getAllMessages();

    return new LocalDerivedSetStore(messageSetStore, (store) =>
        viewModelRepository.conversationMessage(conversation, store),
    );
}
