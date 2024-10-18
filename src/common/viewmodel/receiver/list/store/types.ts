import type {AnyReceiver, AnyReceiverStore, Contact, Group} from '~/common/model';
import type {IDerivableSetStore, LocalDerivedSetStore} from '~/common/utils/store/set-store';
import type {ContactListItemViewModelBundle} from '~/common/viewmodel/contact/list/item';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ContactListProps` that the contact list component expects, excluding props that
 * only exist in the ui layer.
 */
export interface ContactListViewModel {
    readonly contactListItemSetStore: ContactListItemSetStore<Contact>;
    readonly groupContactListItemSetStore: ContactListItemSetStore<Group>;
}

/**
 * {@link SetStore} containing {@link ContactListItemViewModelBundle}s of receivers (of type
 * `TReceiver`).
 */
type ContactListItemSetStore<TReceiver extends AnyReceiver> = LocalDerivedSetStore<
    IDerivableSetStore<AnyReceiverStore>,
    ContactListItemViewModelBundle<TReceiver>
>;
