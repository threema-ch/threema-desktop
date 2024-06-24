import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getConversationStatusMessageViewModelStore,
    type ConversationStatusMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/message/status-message/store';

export interface ConversationStatusMessageViewModelBundle extends PropertiesMarked {
    readonly type: 'status-message';
    readonly viewModelStore: ConversationStatusMessageViewModelStore;
}

export function getConversationStatusMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'model'>,
    messageModelStore: AnyStatusMessageModelStore,
): ConversationStatusMessageViewModelBundle {
    const viewModelStore = getConversationStatusMessageViewModelStore(services, messageModelStore);

    return services.endpoint.exposeProperties({
        type: 'status-message',
        viewModelStore,
    });
}
