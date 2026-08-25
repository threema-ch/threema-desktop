import type {TabState} from '~/app/ui/components/partials/address-book/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';

/**
 * Returns translated placeholder text for a specific tab.
 */
export function getSearchInputPlaceholderForTabState(
    tabState: TabState | undefined,
    t: I18nType['t'],
): string | undefined {
    if (tabState === undefined) {
        return undefined;
    }

    switch (tabState) {
        case 'contacts':
            return t('contacts.label--search-private-contacts', 'Search Contacts');

        case 'groups':
            return t('groups.label--search-groups', 'Search Groups');

        case 'workSubscriptionContacts':
            return t('contacts.label--search-work-contacts', 'Search Company Contacts');

        default:
            return unreachable(tabState);
    }
}
