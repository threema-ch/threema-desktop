import type {AnyDeletedMessageModelStore} from '~/common/model/types/message';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getConversationDeletedMessageViewModelStore,
    type ConversationDeletedMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/message/deleted-message/store';

export interface ConversationDeletedMessageViewModelBundle extends PropertiesMarked {
    readonly viewModelStore: ConversationDeletedMessageViewModelStore;
}

export function getConversationDeletedMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyDeletedMessageModelStore,
): ConversationDeletedMessageViewModelBundle {
    const {endpoint} = services;

    const viewModelStore = getConversationDeletedMessageViewModelStore(services, messageModelStore);

    return endpoint.exposeProperties({
        viewModelStore,
    });
}
