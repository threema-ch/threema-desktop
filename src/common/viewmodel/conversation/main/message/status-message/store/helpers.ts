import {StatusMessageType} from '~/common/enum';
import type {AnyStatusMessageModel} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationStatusMessageViewModel} from '~/common/viewmodel/conversation/main/message/status-message/store/types';
import {getContactDisplayName} from '~/common/viewmodel/utils/contact';

export function getStatusMessageStatus(
    services: Pick<ServicesForViewModel, 'device' | 'model'>,
    statusMessageModel: AnyStatusMessageModel,
    getAndSubscribe: GetAndSubscribeFunction,
): ConversationStatusMessageViewModel['status'] {
    switch (statusMessageModel.type) {
        case StatusMessageType.CHAT_RESTORED:
            return {
                type: statusMessageModel.type,
            };
        case StatusMessageType.GROUP_MEMBER_CHANGED:
            return {
                type: statusMessageModel.type,
                added: statusMessageModel.view.value.added.map((identity) =>
                    getContactDisplayName(services, identity, getAndSubscribe),
                ),
                removed: statusMessageModel.view.value.removed.map((identity) =>
                    getContactDisplayName(services, identity, getAndSubscribe),
                ),
            };

        case StatusMessageType.GROUP_NAME_CHANGED:
            return {
                type: statusMessageModel.type,
                newName: statusMessageModel.view.value.newName,
                oldName: statusMessageModel.view.value.oldName,
            };

        case StatusMessageType.GROUP_CALL_STARTED:
            return {
                type: statusMessageModel.type,
                startedBy: getContactDisplayName(
                    services,
                    statusMessageModel.view.value.startedBy,
                    getAndSubscribe,
                ),
            };

        case StatusMessageType.GROUP_CALL_ENDED:
            return {
                type: statusMessageModel.type,
            };

        case StatusMessageType.GROUP_USER_STATE_CHANGED:
            return {
                type: statusMessageModel.type,
                newUserState: statusMessageModel.view.value.newUserState,
            };

        default:
            return unreachable(statusMessageModel);
    }
}
