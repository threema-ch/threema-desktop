import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';

/**
 * Returns the context menu items for the status message context menu.
 */
export function getContextMenuItems(
    i18n: I18nType,
    onClickMessageDetails: () => void,
    onClickDelete: () => void,
): Readonly<ContextMenuItem[]> {
    return [
        {
            handler: onClickMessageDetails,
            icon: {name: 'info'},
            label: i18n.t('messaging.action--message-option-details', 'Message Details'),
        },
        {
            handler: onClickDelete,
            icon: {
                name: 'delete',
                color: 'default',
                filled: false,
            },
            label: i18n.t('messaging.action--message-option-delete', 'Delete'),
        },
    ];
}

/**
 * Returns the status message text for the given status.
 */
export function getStatusMessageTextForStatus(
    status: StatusMessageProps['status'],
    i18n: I18nType,
): string {
    switch (status.type) {
        case 'group-member-change': {
            return i18n.t(
                'status.prose--group-member-change',
                '{addedCount, plural, =0 {} =1 {{addedMembers} was added to the group} other {{addedMembers} were added to the group}}{and, plural, =0 {} other {, and }}{removedCount, plural, =0 {} =1 {{removedMembers} was removed from the group} other {{removedMembers} were removed from the group}}',

                {
                    addedMembers: status.added.join(', '),
                    removedMembers: status.removed.join(', '),
                    addedCount: `${status.added.length}`,
                    removedCount: `${status.removed.length}`,
                    and: status.added.length > 0 && status.removed.length > 0 ? '1' : '0',
                },
            );
        }

        case 'group-name-change': {
            if (status.oldName === '') {
                return i18n.t(
                    'status.prose--group-created-name',
                    'Group created with name "{name}"',
                    {
                        name: status.newName,
                    },
                );
            }
            return i18n.t(
                'status.prose--group-name-change',
                'The group name was changed from "{old}" to "{new}"',
                {old: status.oldName, new: status.newName},
            );
        }
        default:
            return unreachable(status);
    }
}
