import {MessageDirection} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ConversationModelStore} from '~/common/model/conversation';
import type {
    AnyNonDeletedMessageModel,
    AnyNonDeletedMessageModelStore,
} from '~/common/model/types/message';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getMessageSenderData,
    getMessageStatusData,
} from '~/common/viewmodel/conversation/main/message/helpers';
import {
    getMessageFile,
    getMessageHistory,
    getMessageQuote,
    getMessageReactions,
    getMessageText,
} from '~/common/viewmodel/conversation/main/message/regular-message/store/helpers';
import type {ConversationRegularMessageViewModel} from '~/common/viewmodel/conversation/main/message/regular-message/store/types';

export type ConversationRegularMessageViewModelStore = LocalStore<
    ConversationRegularMessageViewModel & PropertiesMarked
>;

export function getConversationRegularMessageViewModelStore(
    log: Logger,
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyNonDeletedMessageModelStore,
    conversationModelStore: ConversationModelStore,
    resolveQuote: boolean,
): ConversationRegularMessageViewModelStore {
    const {endpoint} = services;

    // eslint-disable-next-line arrow-body-style
    return derive([messageModelStore], ([{currentValue: messageModel}], getAndSubscribe) => {
        const viewModel: ConversationRegularMessageViewModel =
            getConversationRegularMessageViewModel(
                log,
                services,
                messageModel,
                conversationModelStore,
                getAndSubscribe,
                resolveQuote,
            );

        return endpoint.exposeProperties({
            ...viewModel,
        });
    });
}

function getConversationRegularMessageViewModel(
    log: Logger,
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModel: AnyNonDeletedMessageModel,
    conversationModelStore: ConversationModelStore,
    getAndSubscribe: GetAndSubscribeFunction,
    resolveQuote: boolean,
): ConversationRegularMessageViewModel {
    return {
        type: 'regular-message',
        direction:
            messageModel.view.direction === MessageDirection.INBOUND ? 'inbound' : 'outbound',
        file: getMessageFile(messageModel),
        history: getMessageHistory(messageModel),
        id: messageModel.view.id,
        ordinal: messageModel.view.ordinal,
        quote: resolveQuote
            ? getMessageQuote(log, services, messageModel, conversationModelStore, getAndSubscribe)
            : undefined,
        reactions: getMessageReactions(services, messageModel, getAndSubscribe),
        status: getMessageStatusData(messageModel),
        sender: getMessageSenderData(services, messageModel, getAndSubscribe),
        text: getMessageText(services, messageModel, getAndSubscribe),
    };
}
