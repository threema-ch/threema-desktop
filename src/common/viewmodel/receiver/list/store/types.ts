import type {AnyReceiver, AnyReceiverStore, Contact, Group} from '~/common/model';
import type {IDerivableSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {ReceiverListItemViewModelBundle} from '~/common/viewmodel/receiver/list/item';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ReceiverListProps` that the contact list component expects, excluding props that
 * only exist in the ui layer.
 */
export interface ReceiverListViewModel {
    readonly contactListItemSetStore: ReceiverListItemSetStore<Contact>;
    readonly groupListItemSetStore: ReceiverListItemSetStore<Group>;
}

/**
 * {@link SetStore} containing {@link ContactListItemViewModelBundle}s of receivers (of type
 * `TReceiver`).
 */
type ReceiverListItemSetStore<TReceiver extends AnyReceiver> = LocalDerivedSetStore<
    IDerivableSetStore<AnyReceiverStore>,
    ReceiverListItemViewModelBundle<TReceiver>
>;
