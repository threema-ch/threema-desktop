import type {AnyStatusMessageModel} from '~/common/model/types/status';
import {unreachable} from '~/common/utils/assert';
import type {ServicesForViewModel} from '~/common/viewmodel';
import type {ConversationStatusMessageViewModel} from '~/common/viewmodel/conversation/main/status-message/store/types';

export function getStatusMessageStatus(
    services: Pick<ServicesForViewModel, 'model'>,
    statusMessageModel: AnyStatusMessageModel,
): ConversationStatusMessageViewModel['status'] {
    const {contacts} = services.model;
    switch (statusMessageModel.type) {
        case 'group-member-change':
            return {
                type: statusMessageModel.type,
                added: statusMessageModel.view.value.added.map((identity) => {
                    const displayName = contacts.getByIdentity(identity)?.get().view.displayName;
                    if (displayName === undefined) {
                        return identity;
                    }
                    return displayName;
                }),
                removed: statusMessageModel.view.value.removed.map((identity) => {
                    const displayName = contacts.getByIdentity(identity)?.get().view.displayName;
                    if (displayName === undefined) {
                        return identity;
                    }
                    return displayName;
                }),
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
