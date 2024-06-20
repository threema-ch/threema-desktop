import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationListItemViewModel} from '~/common/viewmodel/conversation/list/item/store/types';
import {getConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import {getCallData} from '~/common/viewmodel/utils/call';
import {getReceiverData} from '~/common/viewmodel/utils/receiver';

export type ConversationListItemViewModelStore = LocalStore<
    ConversationListItemViewModel & PropertiesMarked
>;

export function getConversationListItemViewModelStore(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    conversationModelStore: ConversationModelStore,
): ConversationListItemViewModelStore {
    const {endpoint} = services;

    return derive(
        [conversationModelStore],
        ([{currentValue: conversationModel, store}], getAndSubscribe) => {
            const lastMessageModelStore = getAndSubscribe(
                conversationModel.controller.lastMessageStore(),
            );
            const receiver = getAndSubscribe(conversationModel.controller.receiver());
            const properties: ConversationListItemViewModel = {
                call: getCallData(services, receiver, getAndSubscribe),
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
                receiver: getReceiverData(services, receiver, getAndSubscribe),
                totalMessageCount: conversationModel.controller.getMessageCount(),
                unreadMessageCount: conversationModel.view.unreadMessageCount,
                visibility: conversationModel.view.visibility,
            };
            return endpoint.exposeProperties(properties);
        },
    );
}
