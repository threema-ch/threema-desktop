import type {Router} from '~/app/routing/router';
import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/contact-nav/types';
import type {
    ContextMenuItemWithHandlerProps,
    ReceiverPreviewListItem,
} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {DisplayMode} from '~/common/dom/ui/layout';
import type {AnyReceiver} from '~/common/model';
import {DEFAULT_CATEGORY} from '~/common/settings';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

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
    item: ReceiverPreviewListItem<ContextMenuItemHandlerProps<AnyReceiver>>,
    i18n: I18nType,
    handleEdit: (
        listItem: typeof item,
        handlerProps: ContextMenuItemHandlerProps<AnyReceiver>,
    ) => void,
): ContextMenuItemWithHandlerProps<ContextMenuItemHandlerProps<AnyReceiver>>[] {
    return [
        {
            disabled: false,
            handler: (props) => handleEdit(item, props),
            label: i18n.t('contacts.action--edit', 'Edit'),
            icon: {
                name: 'edit',
            },
        },
    ];
}

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
