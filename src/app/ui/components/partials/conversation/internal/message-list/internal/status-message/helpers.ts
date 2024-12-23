import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {StatusMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/status-message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {GroupUserState, StatusMessageType} from '~/common/enum';
import {unreachable} from '~/common/utils/assert';

/**
 * Returns the context menu items for the status message context menu.
 */
export function getContextMenuItems(
    i18n: I18nType,
    onClickMessageDetails: () => void,
    onClickDelete: () => void,
): readonly ContextMenuItem[] {
    return [
        {
            type: 'option',
            handler: onClickMessageDetails,
            icon: {name: 'info'},
            label: i18n.t('messaging.action--message-option-details', 'Message Details'),
        },
        {
            type: 'option',
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
        case StatusMessageType.CHAT_RESTORED: {
            return i18n.t(
                'status.prose--chat-restored',
                'This device was relinked. Future messages will appear below.',
            );
        }
        case StatusMessageType.GROUP_MEMBER_CHANGED: {
            return i18n.t(
                'status.prose--group-member-changed',
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

        case StatusMessageType.GROUP_NAME_CHANGED: {
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
                'status.prose--group-name-changed',
                'The group name was changed from "{old}" to "{new}"',
                {old: status.oldName, new: status.newName},
            );
        }

        case StatusMessageType.GROUP_CALL_STARTED:
            return i18n.t(
                'status.prose--group-call-started',
                '{startedBy} has started a group call',
                {
                    startedBy: status.startedBy,
                },
            );

        case StatusMessageType.GROUP_CALL_ENDED:
            return i18n.t('status.prose--group-call-ended', 'Group call has ended');

        case StatusMessageType.GROUP_USER_STATE_CHANGED:
            return getUserStateStatusMessageText(i18n, status.newUserState);
        default:
            return unreachable(status);
    }
}

function getUserStateStatusMessageText(i18n: I18nType, userState: GroupUserState): string {
    switch (userState) {
        case GroupUserState.MEMBER:
            return i18n.t('status.prose--user-added', 'You were added to the group');
        case GroupUserState.LEFT:
            return i18n.t('status.prose--user-left', 'You have left the group');
        case GroupUserState.KICKED:
            return i18n.t('status.prose--user-kicked', 'You were removed from the group');
        default:
            return unreachable(userState);
    }
}
