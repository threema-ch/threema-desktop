import type {AppServicesForSvelte} from '~/app/types';
import type {TabState} from '~/app/ui/components/partials/address-book/types';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';

/**
 * Props accepted by the `AddressBook` component.
 */
export interface AddressBookProps<THandlerProps = undefined> {
    readonly items: Omit<ReceiverPreviewListProps<THandlerProps>, 'services'>['items'] | undefined;
    readonly options?: {
        /**
         * Whether a button for creating new receivers is displayed. Defaults to `true`.
         */
        readonly allowReceiverCreation?: boolean;
        /**
         * Whether an option for updating receivers is displayed. Defaults to `true`.
         */
        readonly allowReceiverEditing?: boolean;
        /**
         * Whether receivers whose conversation is currently open should be marked as active.
         * Defaults to `true`.
         */
        readonly highlightActiveReceiver?: boolean;
    };
    readonly services: AppServicesForSvelte;
    /**
     * Useful to bind to the current {@link TabState} from outside.
     */
    readonly tabState?: TabState;
}
