import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {IViewModelRepository, ServicesForViewModel} from '~/common/viewmodel';
import {
    ConversationViewModelController,
    type IConversationViewModelController,
} from '~/common/viewmodel/conversation/main/controller';
import {
    getConversationViewModelStore,
    type ConversationViewModelStore,
} from '~/common/viewmodel/conversation/main/store';

export interface ConversationViewModelBundle extends PropertiesMarked {
    readonly viewModelController: IConversationViewModelController;
    readonly viewModelStore: ConversationViewModelStore;
}

export function getConversationViewModelBundle(
    services: ServicesForViewModel,
    viewModelRepository: IViewModelRepository,
    conversationModelStore: ConversationModelStore,
): ConversationViewModelBundle {
    const {endpoint} = services;

    const viewModelController = new ConversationViewModelController(
        services,
        conversationModelStore,
        viewModelRepository,
    );
    const viewModelStore = getConversationViewModelStore(
        services,
        viewModelRepository,
        viewModelController,
        conversationModelStore,
    );

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
