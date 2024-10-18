import type {AnyReceiver} from '~/common/model';
import type {ReceiverDataFor} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ContactListItemProps` that the contact list item component expects, excluding
 * props that only exist in the ui layer.
 */
export interface ContactListItemViewModel<TReceiver extends AnyReceiver> {
    readonly receiver: ReceiverDataFor<TReceiver>;
}
