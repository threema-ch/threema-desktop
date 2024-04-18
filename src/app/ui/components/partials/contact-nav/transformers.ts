import type {AddressBookProps} from '~/app/ui/components/partials/address-book/props';
import type {TabState} from '~/app/ui/components/partials/address-book/types';
import type {
    ContextMenuItemHandlerProps,
    RemoteContactListViewModelStoreValue,
} from '~/app/ui/components/partials/contact-nav/types';
import type {AnyReceiver} from '~/common/model';
import {unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ContactListItemViewModelBundle} from '~/common/viewmodel/contact/list/item';

/**
 * Transforms the `ContactListViewModelStore` to a new store compatible with the shape of props
 * expected by `ReceiverPreviewList` component.
 */
export function contactListViewModelStoreToReceiverPreviewListPropsStore(
    contactListViewModelStore: IQueryableStore<RemoteContactListViewModelStoreValue | undefined>,
    tabState: TabState,
): IQueryableStore<AddressBookProps<ContextMenuItemHandlerProps<AnyReceiver>>['items']> {
    return derive(
        [contactListViewModelStore],
        ([{currentValue: contactListViewModel}], getAndSubscribe) => {
            let filteredListItems: Remote<ContactListItemViewModelBundle<AnyReceiver>>[] = [];
            switch (tabState) {
                case 'contact': {
                    const contactListItemSetStore = contactListViewModel?.contactListItemSetStore;
                    if (contactListItemSetStore === undefined) {
                        return undefined;
                    }

                    // Cast is necessary here, as TypeScript is not able to infer that `Contact` is a subtype
                    // of `AnyReceiver`.
                    filteredListItems = [...getAndSubscribe(contactListItemSetStore)] as Remote<
                        ContactListItemViewModelBundle<AnyReceiver>
                    >[];
                    break;
                }

                case 'group': {
                    const groupContactListItemSetStore =
                        contactListViewModel?.groupContactListItemSetStore;
                    if (groupContactListItemSetStore === undefined) {
                        return undefined;
                    }

                    // Cast is necessary here, as TypeScript is not able to infer that `Group` is a subtype
                    // of `AnyReceiver`.
                    filteredListItems = [
                        ...getAndSubscribe(groupContactListItemSetStore),
                    ] as Remote<ContactListItemViewModelBundle<AnyReceiver>>[];
                    break;
                }

                case 'work-subscription-contact': {
                    const contactListItemSetStore = contactListViewModel?.contactListItemSetStore;
                    if (contactListItemSetStore === undefined) {
                        return undefined;
                    }

                    // Cast is necessary here, as TypeScript is not able to infer that `Contact` is a subtype
                    // of `AnyReceiver`.
                    filteredListItems = [...getAndSubscribe(contactListItemSetStore)].filter(
                        (contactListItem) =>
                            getAndSubscribe(contactListItem.viewModelStore).receiver.verification
                                .type === 'shared-work-subscription',
                    ) as Remote<ContactListItemViewModelBundle<AnyReceiver>>[];
                    break;
                }

                default:
                    return unreachable(tabState);
            }

            return filteredListItems
                .map((viewModelBundle) => ({
                    handlerProps: {
                        viewModelBundle,
                    },
                    receiver: getAndSubscribe(viewModelBundle.viewModelStore).receiver,
                }))
                .sort((a, b) => a.receiver.name.localeCompare(b.receiver.name));
        },
    );
}
