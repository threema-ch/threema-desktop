import {ConversationCategory, ConversationVisibility} from '~/common/enum';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {SetOfAnyLocalMessageModelStore} from '~/common/model/types/message';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import type {IConversationViewModelController} from '~/common/viewmodel/conversation/main/controller';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import {
    getLastMessage,
    getMessageSetStore,
} from '~/common/viewmodel/conversation/main/store/helpers';
import type {ConversationViewModel} from '~/common/viewmodel/conversation/main/store/types';
import {getReceiverData} from '~/common/viewmodel/utils/receiver';

export type ConversationViewModelStore = LocalStore<ConversationViewModel & PropertiesMarked>;

/**
 * Partial store of a conversation's messages, as it should be provided by the viewmodel.
 *
 * Note: It is not guaranteed that all messages of the conversation are included (hence, "partial");
 * However, the following messages can be expected to be included:
 *
 * - The messages that are currently visible in the viewport, as reported by the UI layer.
 * - A large enough window of messages immediately preceding or succeeding the currently visible
 *   viewport messages (as reported by the UI layer) to fill (at least) one realistic viewport
 *   height.
 * - A large enough window of messages immediately before (and including) the last message to fill
 *   (at least) one realistic viewport height.
 */
export type ConversationMessageSetStore = LocalDerivedSetStore<
    SetOfAnyLocalMessageModelStore,
    ConversationMessageViewModelBundle
>;

export function getConversationViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    viewModelRepository: IViewModelRepository,
    conversationViewModelController: IConversationViewModelController,
    conversationModelStore: ConversationModelStore,
): ConversationViewModelStore {
    const {endpoint} = services;

    const messageSetStore = getMessageSetStore(
        services,
        viewModelRepository,
        conversationViewModelController,
        conversationModelStore,
    );

    return derive(
        [conversationModelStore],
        ([{currentValue: conversationModel}], getAndSubscribe) =>
            endpoint.exposeProperties({
                category: conversationModel.view.category,
                firstUnreadMessageId: conversationModel.controller.getFirstUnreadMessageId(),
                id: conversationModel.ctx,
                isArchived: conversationModel.view.visibility === ConversationVisibility.ARCHIVED,
                isPinned: conversationModel.view.visibility === ConversationVisibility.PINNED,
                isPrivate: conversationModel.view.category === ConversationCategory.PROTECTED,
                lastMessage: getLastMessage(conversationModel, getAndSubscribe),
                messageSetStore,
                receiver: getReceiverData(services, conversationModel, getAndSubscribe),
                totalMessagesCount: conversationModel.controller.getMessageCount(),
                unreadMessagesCount: conversationModel.view.unreadMessageCount,
            }),
    );
}
