import type {ContactReceiverData, SelfReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `ContactDetailProps` that the contact detail component expects, excluding props
 * that only exist in the ui layer.
 */
export interface ContactDetailViewModel {
    readonly receiver: ContactReceiverData;
    readonly user: SelfReceiverData;
}
