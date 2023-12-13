import {MessageDirection} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {AnyMessageModel, AnyMessageModelStore} from '~/common/model/types/message';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getMessageFile,
    getMessageQuote,
    getMessageReactions,
    getMessageSender,
    getMessageStatus,
    getMessageText,
} from '~/common/viewmodel/conversation/main/message/store/helpers';
import type {ConversationMessageViewModel} from '~/common/viewmodel/conversation/main/message/store/types';

export type ConversationMessageViewModelStore = LocalStore<
    ConversationMessageViewModel & PropertiesMarked
>;

export function getConversationMessageViewModelStore(
    log: Logger,
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyMessageModelStore,
    conversationModelStore: ConversationModelStore,
): ConversationMessageViewModelStore {
    const {endpoint} = services;

    // eslint-disable-next-line arrow-body-style
    return derive(messageModelStore, (messageModel, getAndSubscribe) => {
        const conversationMessageViewModel: ConversationMessageViewModel =
            getConversationMessageViewModel(
                log,
                services,
                messageModel,
                conversationModelStore,
                getAndSubscribe,
            );

        return endpoint.exposeProperties({
            ...conversationMessageViewModel,
        });
    });
}

function getConversationMessageViewModel(
    log: Logger,
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    messageModel: AnyMessageModel,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationMessageViewModel {
    return {
        direction:
            messageModel.view.direction === MessageDirection.INBOUND ? 'inbound' : 'outbound',
        file: getMessageFile(messageModel),
        id: messageModel.view.id,
        ordinal: messageModel.view.ordinal,
        quote: getMessageQuote(
            log,
            services,
            messageModel,
            conversationModelStore,
            getAndSubscribe,
        ),
        reactions: getMessageReactions(services, messageModel),
        status: getMessageStatus(messageModel),
        sender: getMessageSender(services, messageModel, getAndSubscribe),
        text: getMessageText(services, messageModel),
    };
}
