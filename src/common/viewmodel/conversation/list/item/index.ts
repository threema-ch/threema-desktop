import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ConversationListItemViewModelController,
    type IConversationListItemViewModelController,
} from '~/common/viewmodel/conversation/list/item/controller';
import {
    getConversationListItemViewModelStore,
    type ConversationListItemViewModelStore,
} from '~/common/viewmodel/conversation/list/item/store';

export interface ConversationListItemViewModelBundle extends PropertiesMarked {
    readonly viewModelController: IConversationListItemViewModelController;
    readonly viewModelStore: ConversationListItemViewModelStore;
}

export function getConversationListItemViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    conversationModelStore: ConversationModelStore,
): ConversationListItemViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new ConversationListItemViewModelController(conversationModelStore);
    const viewModelStore = getConversationListItemViewModelStore(services, conversationModelStore);

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
