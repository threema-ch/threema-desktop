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
    getMessageHistory,
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
    resolveQuote: boolean,
): ConversationMessageViewModelStore {
    const {endpoint} = services;

    // eslint-disable-next-line arrow-body-style
    return derive([messageModelStore], ([{currentValue: messageModel}], getAndSubscribe) => {
        const conversationMessageViewModel: ConversationMessageViewModel =
            getConversationMessageViewModel(
                log,
                services,
                messageModel,
                conversationModelStore,
                getAndSubscribe,
                resolveQuote,
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
    resolveQuote: boolean,
): ConversationMessageViewModel {
    return {
        direction:
            messageModel.view.direction === MessageDirection.INBOUND ? 'inbound' : 'outbound',
        file: getMessageFile(messageModel),
        history: getMessageHistory(services, messageModel),
        id: messageModel.view.id,
        lastEditedAt: messageModel.view.lastEditedAt,
        ordinal: messageModel.view.ordinal,
        quote: resolveQuote
            ? getMessageQuote(log, services, messageModel, conversationModelStore)
            : undefined,
        reactions: getMessageReactions(services, messageModel),
        status: getMessageStatus(messageModel),
        sender: getMessageSender(services, messageModel, getAndSubscribe),
        text: getMessageText(services, messageModel),
    };
}
