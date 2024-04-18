import type {EditContactModalProps} from '~/app/ui/components/partials/modals/edit-contact-modal/props';
import type {AnyReceiver} from '~/common/model';
import type {Remote} from '~/common/utils/endpoint';
import type {ContactListViewModelBundle} from '~/common/viewmodel/contact/list';
import type {ContactListItemViewModelBundle} from '~/common/viewmodel/contact/list/item';

/**
 * Type of the value contained in a `ContactListViewModelStore` transferred from {@link Remote}.
 */
export type RemoteContactListViewModelStoreValue = ReturnType<
    Remote<ContactListViewModelBundle>['viewModelStore']['get']
>;

/**
 * Type of the props passed to each context menu item's handler callback.
 */
export interface ContextMenuItemHandlerProps<TReceiver extends AnyReceiver> {
    readonly viewModelBundle: Remote<ContactListItemViewModelBundle<TReceiver>>;
}

export type ModalState = NoneModalState | EditContactModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface EditContactModalState {
    readonly type: 'edit-contact';
    readonly props: EditContactModalProps;
}
