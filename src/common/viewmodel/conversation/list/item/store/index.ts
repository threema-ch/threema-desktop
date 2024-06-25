import {MessageType} from '~/common/enum';
import type {ConversationModelStore} from '~/common/model/conversation';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationListItemViewModel} from '~/common/viewmodel/conversation/list/item/store/types';
import {getConversationDeletedMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/deleted-message';
import type {AnyConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/helpers';
import {getConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
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

            let lastMessageViewModelBundle: AnyConversationMessageViewModelBundle | undefined =
                undefined;
            if (lastMessageModelStore !== undefined) {
                switch (lastMessageModelStore.type) {
                    case MessageType.DELETED:
                        lastMessageViewModelBundle = getConversationDeletedMessageViewModelBundle(
                            services,
                            lastMessageModelStore,
                        );
                        break;

                    case MessageType.AUDIO:
                    case MessageType.FILE:
                    case MessageType.IMAGE:
                    case MessageType.TEXT:
                    case MessageType.VIDEO:
                        lastMessageViewModelBundle = getConversationRegularMessageViewModelBundle(
                            services,
                            lastMessageModelStore,
                            store,
                            false,
                        );
                        break;

                    default:
                        return unreachable(lastMessageModelStore);
                }
            }

            const properties: ConversationListItemViewModel = {
                call: getCallData(services, receiver, getAndSubscribe),
                category: conversationModel.view.category,
                isTyping: conversationModel.view.isTyping ?? false,
                lastMessage: lastMessageViewModelBundle,
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
