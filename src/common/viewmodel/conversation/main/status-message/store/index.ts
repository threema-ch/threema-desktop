import type {AnyStatusMessageModel, AnyStatusMessageModelStore} from '~/common/model/types/status';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getStatusMessageStatus} from '~/common/viewmodel/conversation/main/status-message/store/helpers';
import type {ConversationStatusMessageViewModel} from '~/common/viewmodel/conversation/main/status-message/store/types';

export type ConversationStatusMessageViewModelStore = LocalStore<
    ConversationStatusMessageViewModel & PropertiesMarked
>;

export function getConversationStatusMessageViewModelStore(
    services: Pick<ServicesForViewModel, 'endpoint'>,
    statusMessageModelStore: AnyStatusMessageModelStore,
): ConversationStatusMessageViewModelStore {
    const {endpoint} = services;

    return derive([statusMessageModelStore], ([{currentValue: statusMessageModel}]) => {
        const conversationStatusMessageViewModel: ConversationStatusMessageViewModel =
            getConversationStatusMessageViewModel(statusMessageModel);

        return endpoint.exposeProperties({
            ...conversationStatusMessageViewModel,
        });
    });
}

function getConversationStatusMessageViewModel(
    statusMessageModel: AnyStatusMessageModel,
): ConversationStatusMessageViewModel {
    return {
        type: 'status-message',
        created: {at: statusMessageModel.view.createdAt},
        id: statusMessageModel.view.id,
        ordinal: statusMessageModel.view.ordinal,
        status: getStatusMessageStatus(statusMessageModel),
    };
}
