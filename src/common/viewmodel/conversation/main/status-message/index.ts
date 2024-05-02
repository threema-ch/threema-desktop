import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    GroupMemberChangeViewModelController,
    GroupNameChangeViewModelController,
    type IConversationStatusMessageViewModelController,
} from '~/common/viewmodel/conversation/main/status-message/controller';
import {
    getConversationStatusMessageViewModelStore,
    type ConversationStatusMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/status-message/store';

export interface ConversationStatusMessageViewModelBundle extends PropertiesMarked {
    readonly viewModelController: IConversationStatusMessageViewModelController;
    readonly viewModelStore: ConversationStatusMessageViewModelStore;
}

export function getConversationStatusMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'endpoint' | 'model'>,
    statusMessageModelStore: AnyStatusMessageModelStore,
): ConversationStatusMessageViewModelBundle {
    const {endpoint} = services;

    let viewModelController: IConversationStatusMessageViewModelController;
    switch (statusMessageModelStore.type) {
        case 'group-member-change':
            viewModelController = new GroupMemberChangeViewModelController(statusMessageModelStore);
            break;
        case 'group-name-change':
            viewModelController = new GroupNameChangeViewModelController(statusMessageModelStore);
            break;
        default:
            return unreachable(statusMessageModelStore);
    }
    const viewModelStore = getConversationStatusMessageViewModelStore(
        services,
        statusMessageModelStore,
    );

    return endpoint.exposeProperties({
        viewModelController,
        viewModelStore,
    });
}
