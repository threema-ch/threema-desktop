import {MessageDirection} from '~/common/enum';
import type {
    AnyDeletedMessageModel,
    AnyDeletedMessageModelStore,
} from '~/common/model/types/message';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {type GetAndSubscribeFunction, derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationDeletedMessageViewModel} from '~/common/viewmodel/conversation/main/message/deleted-message/store/types';
import {
    getMessageSenderData,
    getMessageStatusData,
} from '~/common/viewmodel/conversation/main/message/helpers';

export type ConversationDeletedMessageViewModelStore = LocalStore<
    ConversationDeletedMessageViewModel & PropertiesMarked
>;

export function getConversationDeletedMessageViewModelStore(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModelStore: AnyDeletedMessageModelStore,
): ConversationDeletedMessageViewModelStore {
    const {endpoint} = services;

    // eslint-disable-next-line arrow-body-style
    return derive([messageModelStore], ([{currentValue: messageModel}], getAndSubscribe) => {
        const viewModel: ConversationDeletedMessageViewModel =
            getConversationDeletedMessageViewModel(services, messageModel, getAndSubscribe);

        return endpoint.exposeProperties({
            ...viewModel,
        });
    });
}

function getConversationDeletedMessageViewModel(
    services: Pick<ServicesForViewModel, 'device' | 'endpoint' | 'logging' | 'model'>,
    messageModel: AnyDeletedMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationDeletedMessageViewModel {
    return {
        type: 'deleted-message',
        direction:
            messageModel.view.direction === MessageDirection.INBOUND ? 'inbound' : 'outbound',
        id: messageModel.view.id,
        ordinal: messageModel.view.ordinal,
        status: getMessageStatusData(messageModel),
        sender: getMessageSenderData(services, messageModel, getAndSubscribe),
    };
}
