import {SyncEvent} from 'ts-events';

import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/conversation-nav/types';
import type {
    ContextMenuItemWithHandlerProps,
    ConversationPreviewListItem,
} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import {ensureError} from '~/common/utils/assert';

interface ConversationNavEvent {
    action: 'scroll-to-top';
}
export const conversationListEvent = new SyncEvent<ConversationNavEvent>();

export function getContextMenuItems(
    item: ConversationPreviewListItem<ContextMenuItemHandlerProps>,
    i18n: I18nType,
    log: Logger,
    handleClear: (listItem: typeof item, handlerProps: ContextMenuItemHandlerProps) => void,
    handleDelete: (listItem: typeof item, handlerProps: ContextMenuItemHandlerProps) => void,
): ContextMenuItemWithHandlerProps<ContextMenuItemHandlerProps>[] {
    return [
        {
            type: 'option',
            disabled: item.totalMessageCount === 0,
            handler: (props) => handleClear(item, props),
            label: i18n.t('messaging.action--empty-conversation', 'Empty Chat'),
            icon: {
                name: 'delete_sweep',
            },
        },
        {
            type: 'option',
            handler: (props) => {
                void props.viewModelBundle.viewModelController
                    .togglePinned()
                    .catch((error: unknown) => {
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
            type: 'option',
            handler: (props) => {
                void props.viewModelBundle.viewModelController
                    .toggleArchived()
                    .catch((error: unknown) => {
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
            type: 'option',
            handler: (props) => handleDelete(item, props),
            label: i18n.t('messaging.action--conversation-option-delete', 'Delete'),
            icon: {
                name: 'delete_forever',
            },
        },
    ];
}
