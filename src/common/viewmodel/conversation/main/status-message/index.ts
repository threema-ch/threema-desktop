import type {Logger} from '~/common/logging';
import type {AnyStatusMessageModelStore, AnyStatusMessageView} from '~/common/model/types/status';
import {statusMessageUidToStatusMessageId, type StatusMessageId} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    GroupMemberChangeViewModelController,
    GroupNameChangeViewModelController,
    type IConversationStatusMessageViewModelController,
} from '~/common/viewmodel/conversation/main/status-message/controller';

export type ConversationStatusMessageViewModelBundle = {
    readonly viewModelController: IConversationStatusMessageViewModelController;
    readonly viewModelStore: StatusMessageViewModelStore;
} & PropertiesMarked;

export type StatusMessageViewModelStore = LocalStore<
    AnyStatusMessageView & {
        id: StatusMessageId;
        conversationMessageType: 'status';
    } & PropertiesMarked
>;

export function getStatusMessageViewModelStore(
    log: Logger,
    services: Pick<ServicesForViewModel, 'endpoint' | 'logging' | 'model'>,
    statusMessageModelStore: AnyStatusMessageModelStore,
): StatusMessageViewModelStore {
    const {endpoint} = services;

    // eslint-disable-next-line arrow-body-style
    return derive([statusMessageModelStore], ([{currentValue: statusMessageModel}]) =>
        endpoint.exposeProperties({
            ...statusMessageModel.view,
            conversationMessageType: 'status',
            // Needed for a unique distinguisher in the frontend.
            id: statusMessageUidToStatusMessageId(statusMessageModel.controller.uid),
        }),
    );
}

export function getConversationStatusMessageViewModelBundle(
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
        viewModelController,
        viewModelStore,
    });
}
