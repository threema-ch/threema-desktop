import type {AnyMessageModelStore} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ConversationMessageViewModelController,
    type IConversationMessageViewModelController,
} from '~/common/viewmodel/conversation/main/message/controller';
import {
    getConversationMessageViewModelStore,
    type ConversationMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/message/store';

export interface ConversationMessageViewModelBundle extends PropertiesMarked {
    readonly type: 'message';
    readonly viewModelController: IConversationMessageViewModelController;
    readonly viewModelStore: ConversationMessageViewModelStore;
}

export function getConversationMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
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
