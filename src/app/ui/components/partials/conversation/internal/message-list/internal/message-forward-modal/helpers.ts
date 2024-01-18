import type {I18nType} from '~/app/ui/i18n-types';
import type {ContactTab} from '~/app/ui/nav';
import {unreachable} from '~/common/utils/assert';

/**
 * Returns translated placeholder text for a specific tab.
 */
export function getSearchInputPlaceholderForTab(tab: ContactTab, t: I18nType['t']): string {
    switch (tab) {
        case 'work-contacts':
            return t(
                'dialog--forward-message.label--search-work-contacts',
                'Search Company Contacts',
            );
        case 'private-contacts':
            return t('dialog--forward-message.label--search-private-contacts', 'Search Contacts');
        case 'groups':
            return t('dialog--forward-message.label--search-groups', 'Search Groups');
        case 'distribution-lists':
            return t(
                'dialog--forward-message.label--search-distribution-lists',
                'Search Distribution Lists',
            );
        default:
            return unreachable(tab);
    }
}
