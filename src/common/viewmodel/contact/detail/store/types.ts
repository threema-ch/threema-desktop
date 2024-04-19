import type {AnyReceiver} from '~/common/model';
import type {ReceiverDataFor, SelfReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ContactDetailProps` that the contact detail component expects, excluding props
 * that only exist in the ui layer.
 */
export interface ContactDetailViewModel<TReceiver extends AnyReceiver> {
    readonly receiver: ReceiverDataFor<TReceiver>;
    readonly user: SelfReceiverData;
}
