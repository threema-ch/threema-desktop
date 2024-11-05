import type {EditContactModalProps} from '~/app/ui/components/partials/modals/edit-contact-modal/props';
import type {AnyReceiver} from '~/common/model';
import type {Remote} from '~/common/utils/endpoint';
import type {ReceiverListViewModelBundle} from '~/common/viewmodel/receiver/list';
import type {ReceiverListItemViewModelBundle} from '~/common/viewmodel/receiver/list/item';

/**
 * Type of the value contained in a `ReceiverListViewModelStore` transferred from {@link Remote}.
 */
export type RemoteReceiverListViewModelStoreValue = ReturnType<
    Remote<ReceiverListViewModelBundle>['viewModelStore']['get']
>;

/**
 * Type of the props passed to each context menu item's handler callback.
 */
export interface ContextMenuItemHandlerProps<TReceiver extends AnyReceiver> {
    readonly viewModelBundle: Remote<ReceiverListItemViewModelBundle<TReceiver>>;
}

export type ModalState = NoneModalState | EditContactModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface EditContactModalState {
    readonly type: 'edit-contact';
    readonly props: EditContactModalProps;
}
