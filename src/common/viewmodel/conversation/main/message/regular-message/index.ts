import type {AnyMessageModelStore} from '~/common/model';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    ConversationRegularMessageViewModelController,
    type IConversationRegularMessageViewModelController,
} from '~/common/viewmodel/conversation/main/message/regular-message/controller';
import {
    getConversationRegularMessageViewModelStore,
    type ConversationRegularMessageViewModelStore,
} from '~/common/viewmodel/conversation/main/message/regular-message/store';

export interface ConversationRegularMessageViewModelBundle extends PropertiesMarked {
    readonly type: 'message';
    readonly viewModelController: IConversationRegularMessageViewModelController;
    readonly viewModelStore: ConversationRegularMessageViewModelStore;
}

export function getConversationRegularMessageViewModelBundle(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyMessageModelStore,
    conversationModelStore: ConversationModelStore,
    resolveQuote: boolean,
): ConversationRegularMessageViewModelBundle {
    const {endpoint, logging} = services;
    const log = logging.logger('viewmodel.conversation.message');

    const viewModelController = new ConversationRegularMessageViewModelController(
        messageModelStore,
    );
    const viewModelStore = getConversationRegularMessageViewModelStore(
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
