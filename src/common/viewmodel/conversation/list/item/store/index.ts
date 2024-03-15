import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationListItemViewModel} from '~/common/viewmodel/conversation/list/item/store/types';
import {getConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import {getReceiverData} from '~/common/viewmodel/utils/receiver';

export type ConversationListItemViewModelStore = LocalStore<
    ConversationListItemViewModel & PropertiesMarked
>;

export function getConversationListItemViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    conversationModelStore: ConversationModelStore,
): ConversationListItemViewModelStore {
    const {endpoint} = services;

    return derive(
        [conversationModelStore],
        ([{currentValue: conversationModel, store}], getAndSubscribe) => {
            const lastMessageModelStore = getAndSubscribe(
                conversationModel.controller.lastMessageStore(),
            );

            return endpoint.exposeProperties({
                category: conversationModel.view.category,
                lastMessage:
                    lastMessageModelStore === undefined
                        ? undefined
                        : getConversationMessageViewModelBundle(
                              services,
                              lastMessageModelStore,
                              store,
                              false,
                          ),
                lastUpdate: conversationModel.view.lastUpdate,
                receiver: getReceiverData(services, conversationModel, getAndSubscribe),
                totalMessageCount: conversationModel.controller.getMessageCount(),
                unreadMessageCount: conversationModel.view.unreadMessageCount,
                visibility: conversationModel.view.visibility,
            });
        },
    );
}
