import type {AnyMessageModelStore} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyStatusMessageModelStore} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ConversationMessageViewModelController,
    GroupMemberChangeViewModelController,
    GroupNameChangeViewModelController,
    type IConversationMessageViewModelController,
    type IConversationStatusMessageViewModelController,
} from '~/common/viewmodel/conversation/main/message/controller';
import {
    getConversationMessageViewModelStore,
    type ConversationMessageViewModelStore,
    type StatusMessageViewModelStore,
    getStatusMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/message/store';

/**
 * This type is the Union of all messages that can be displayed in a conversation,
 * e.g {@link StatusMessages} and {@link ConversationMessage}
 */
export type ConversationAnyMessageViewModelBundle =
    | ConversationMessageViewModelBundle
    | ConversationStatusMessageViewModelBundle;

export type ConversationMessageViewModelBundle = {
    readonly type: 'message';
    readonly viewModelController: IConversationMessageViewModelController;
    readonly viewModelStore: ConversationMessageViewModelStore;
} & PropertiesMarked;

export type ConversationStatusMessageViewModelBundle = {
    readonly type: 'status';
    readonly viewModelController: IConversationStatusMessageViewModelController;
    readonly viewModelStore: StatusMessageViewModelStore;
} & PropertiesMarked;

export function getConversationMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyMessageModelStore,
    conversationModelStore: ConversationModelStore,
    resolveQuote: boolean,
): ConversationMessageViewModelBundle {
    const {endpoint, logging} = services;
    const log = logging.logger('viewmodel.conversation.message');

    const viewModelController = new ConversationMessageViewModelController(messageModelStore);
    const viewModelStore = getConversationMessageViewModelStore(
        log,
        services,
        messageModelStore,
        conversationModelStore,
        resolveQuote,
    );

    return endpoint.exposeProperties({
        type: 'message',
        viewModelController,
        viewModelStore,
    });
}

export function getConversationStatusMesageViewModelBundle(
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    statusMessageModelStore: AnyStatusMessageModelStore,
): ConversationStatusMessageViewModelBundle {
    const {endpoint, logging} = services;
    const log = logging.logger('viewmodel.conversation.message');

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
    const viewModelStore = getStatusMessageViewModelStore(log, services, statusMessageModelStore);

    return endpoint.exposeProperties({
        type: 'status',
        viewModelController,
        viewModelStore,
    });
}
