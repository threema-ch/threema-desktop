import type {
    ContextMenuItemHandlerProps,
    RemoteContactListViewModelStoreValue,
    TabState,
} from '~/app/ui/components/partials/contact-nav/types';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {AnyReceiver} from '~/common/model';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive, type GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ContactListItemViewModelBundle} from '~/common/viewmodel/contact/list/item';

/**
 * Transforms the `ContactListViewModelStore` to a new store compatible with the shape of props
 * expected by `ReceiverPreviewList` component.
 */
export function contactListViewModelStoreToReceiverPreviewListPropsStore(
    contactListViewModelStore: IQueryableStore<RemoteContactListViewModelStoreValue | undefined>,
    tabState: TabState,
    /**
     * An optional function to filter list items.
     */
    filter?: (
        item: Omit<
            ReceiverPreviewListProps<ContextMenuItemHandlerProps<AnyReceiver>>,
            'services'
        >['items'][u53],
        getAndSubscribe: GetAndSubscribeFunction,
    ) => boolean,
): IQueryableStore<
    Omit<ReceiverPreviewListProps<ContextMenuItemHandlerProps<AnyReceiver>>, 'services'> | undefined
> {
    return derive(
        [contactListViewModelStore],
        ([{currentValue: currentViewModel}], getAndSubscribe) => {
            let filteredListItems: Remote<ContactListItemViewModelBundle<AnyReceiver>>[] = [];
            switch (tabState) {
                case 'contact': {
                    const contactListItemSetStore = currentViewModel?.contactListItemSetStore;
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
                        currentViewModel?.groupContactListItemSetStore;
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
                    const contactListItemSetStore = currentViewModel?.contactListItemSetStore;
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

            return {
                items: filteredListItems
                    .map((viewModelBundle) => ({
                        handlerProps: {
                            viewModelBundle,
                        },
                        receiver: getAndSubscribe(viewModelBundle.viewModelStore).receiver,
                    }))
                    .filter((item) => (filter === undefined ? true : filter(item, getAndSubscribe)))
                    .sort((a, b) => a.receiver.name.localeCompare(b.receiver.name)),
            };
        },
    );
}
