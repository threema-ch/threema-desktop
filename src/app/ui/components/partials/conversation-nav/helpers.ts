import {SyncEvent} from 'ts-events';

import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/conversation-nav/types';
import type {
    ContextMenuItemWithHandlerProps,
    ConversationPreviewListItem,
} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {DisplayMode} from '~/common/dom/ui/layout';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {DEFAULT_CATEGORY} from '~/common/settings';
import {ensureError} from '~/common/utils/assert';

interface ConversationNavEvent {
    action: 'scroll-to-top';
}
export const conversationListEvent = new SyncEvent<ConversationNavEvent>();

export function goToSettings(router: Router, display?: DisplayMode): void {
    router.go(
        ROUTE_DEFINITIONS.nav.settingsList.withoutParams(),
        // Note: When opening settings in small display mode, we want to see the settings
        //       categories, not the profile settings.
        display === 'small'
            ? ROUTE_DEFINITIONS.main.welcome.withoutParams()
            : ROUTE_DEFINITIONS.main.settings.withTypedParams({category: DEFAULT_CATEGORY}),
        undefined,
    );
}

export function getContextMenuItems(
    item: ConversationPreviewListItem<ContextMenuItemHandlerProps>,
    i18n: I18nType,
    log: Logger,
    handleClear: (listItem: typeof item, handlerProps: ContextMenuItemHandlerProps) => void,
    handleDelete: (listItem: typeof item, handlerProps: ContextMenuItemHandlerProps) => void,
): ContextMenuItemWithHandlerProps<ContextMenuItemHandlerProps>[] {
    return [
        {
            disabled: item.totalMessageCount === 0,
            handler: (props) => handleClear(item, props),
            label: i18n.t('messaging.action--empty-conversation', 'Empty Chat'),
            icon: {
                name: 'delete_sweep',
            },
        },
        {
            handler: (props) => {
                void props.viewModelBundle.viewModelController.togglePinned().catch((error) => {
                    log.error(
                        `${item.isPinned ? 'Unpinning' : 'Pinning'} conversation failed: ${extractErrorMessage(ensureError(error), 'short')}`,
                    );
                });
            },
            label: item.isPinned
                ? i18n.t('messaging.action--conversation-option-unpin', 'Unpin')
                : i18n.t('messaging.action--conversation-option-pin', 'Pin'),
            icon: {
                name: 'push_pin',
            },
        },
        {
            handler: (props) => {
                void props.viewModelBundle.viewModelController.toggleArchived().catch((error) => {
                    log.error(
                        `${item.isArchived ? 'Unarchiving' : 'Archiving'} conversation failed: ${extractErrorMessage(ensureError(error), 'short')}`,
                    );
                });
            },
            label: item.isArchived
                ? i18n.t('messaging.action--conversation-option-unarchive', 'Unarchive')
                : i18n.t('messaging.action--conversation-option-archive', 'Archive'),
            icon: {
                name: item.isArchived ? 'unarchive' : 'archive',
            },
        },
        {
            handler: (props) => handleDelete(item, props),
            label: i18n.t('messaging.action--conversation-option-delete', 'Delete'),
            icon: {
                name: 'delete_forever',
            },
        },
    ];
}
