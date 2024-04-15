import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {I18nType} from '~/app/ui/i18n-types';

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
