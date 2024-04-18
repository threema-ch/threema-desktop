import type {TabState} from '~/app/ui/components/partials/address-book/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Return whether the given `receiver` matches the provided `searchTerm`. Note: If the `searchTerm`
 * is `undefined` or an empty string, the result will always be `true`.
 */
export function isReceiverMatchingSearchTerm(
    receiver: AnyReceiverData,
    searchTerm: string | undefined,
): boolean {
    if (searchTerm === undefined) {
        return true;
    }

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();
    if (trimmedSearchTerm === '') {
        return true;
    }

    switch (receiver.type) {
        case 'contact':
            return [
                receiver.name,
                receiver.firstName,
                receiver.lastName,
                receiver.nickname,
                receiver.identity,
            ]
                .filter((value): value is string => value !== undefined)
                .join(' ')
                .toLowerCase()
                .includes(trimmedSearchTerm);

        case 'distribution-list':
        case 'group':
            return [receiver.name].join(' ').toLowerCase().includes(trimmedSearchTerm);

        default:
            return unreachable(receiver);
    }
}

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
        case 'contact':
            return t('contacts.label--search-private-contacts', 'Search Contacts');

        case 'group':
            return t('contacts.label--search-groups', 'Search Groups');

        case 'work-subscription-contact':
            return t('contacts.label--search-work-contacts', 'Search Company Contacts');

        default:
            return unreachable(tabState);
    }
}
