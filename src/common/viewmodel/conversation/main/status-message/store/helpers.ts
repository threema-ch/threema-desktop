import type {AnyStatusMessageModel} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import type {ConversationStatusMessageViewModel} from '~/common/viewmodel/conversation/main/status-message/store/types';

export function getStatusMessageStatus(
    statusMessageModel: AnyStatusMessageModel,
): ConversationStatusMessageViewModel['status'] {
    switch (statusMessageModel.type) {
        case 'group-member-change':
            return {
                type: statusMessageModel.type,
                added: statusMessageModel.view.value.added,
                removed: statusMessageModel.view.value.removed,
            };

        case 'group-name-change':
            return {
                type: 'group-name-change',
                newName: statusMessageModel.view.value.newName,
                oldName: statusMessageModel.view.value.oldName,
            };

        default:
            return unreachable(statusMessageModel);
    }
}
