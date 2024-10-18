import type {AddressBookProps} from '~/app/ui/components/partials/address-book/props';
import type {TabState} from '~/app/ui/components/partials/address-book/types';
import type {
    ContextMenuItemHandlerProps,
    RemoteReceiverListViewModelStoreValue,
} from '~/app/ui/components/partials/contact-nav/types';
import type {AnyReceiver} from '~/common/model';
import {unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ReceiverListItemViewModelBundle} from '~/common/viewmodel/receiver/list/item';

/**
 * Transforms the `ReceiverListViewModelStore` to a new store compatible with the shape of props
 * expected by `ReceiverPreviewList` component.
 */
export function receiverListViewModelStoreToReceiverPreviewListPropsStore(
    receiverListViewModelStore: IQueryableStore<RemoteReceiverListViewModelStoreValue | undefined>,
    tabState: TabState,
): IQueryableStore<AddressBookProps<ContextMenuItemHandlerProps<AnyReceiver>>['items']> {
    return derive(
        [receiverListViewModelStore],
        ([{currentValue: contactListViewModel}], getAndSubscribe) => {
            let filteredListItems: Remote<ReceiverListItemViewModelBundle<AnyReceiver>>[] = [];
            switch (tabState) {
                case 'contact': {
                    const contactListItemSetStore = contactListViewModel?.contactListItemSetStore;
                    if (contactListItemSetStore === undefined) {
                        return undefined;
                    }

                    // Cast is necessary here, as TypeScript is not able to infer that `Contact` is a subtype
                    // of `AnyReceiver`.
                    filteredListItems = [...getAndSubscribe(contactListItemSetStore)] as Remote<
                        ReceiverListItemViewModelBundle<AnyReceiver>
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
                    ] as Remote<ReceiverListItemViewModelBundle<AnyReceiver>>[];
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
                    ) as Remote<ReceiverListItemViewModelBundle<AnyReceiver>>[];
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
