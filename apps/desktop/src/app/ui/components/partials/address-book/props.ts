import type {Snippet} from 'svelte';

import type {AppServicesForSvelte} from '~/app/types';
import type {
    AddressBookState,
    GroupedReceivers,
} from '~/app/ui/components/partials/address-book/types';
import type {ContactAddFormProps} from '~/app/ui/components/partials/contact-add-form/props';
import type {GroupAddFormProps} from '~/app/ui/components/partials/group-add-form/props';
import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/receiver-nav/types';
import type {AnyReceiver} from '~/common/model';
import type {AnyReceiverDataOrSelf} from '~/common/viewmodel/utils/receiver';
/**
 * Props accepted by the `AddressBook` component.
 */
export interface AddressBookProps {
    readonly actions: ContactAddFormProps['actions'] & GroupAddFormProps['actions'];

    /**
     * The current component state. Useful to steer the initial state from the outside. Defaults to
     * `receiver-preview-list`.
     */
    readonly componentState?: AddressBookState;

    /**
     * The items of the address book, grouped by category. The address book expects them to be
     * already sorted.
     */
    readonly items: GroupedReceivers;
    readonly onclickedititem?: (item: ContextMenuItemHandlerProps<AnyReceiver>) => void;
    readonly onclickitem?: (receiver: AnyReceiverDataOrSelf, active: boolean) => void;
    readonly onselectitem?: (receiver: AnyReceiverDataOrSelf, selected: boolean) => void;
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
    readonly snippetTopbar?: Snippet;
}
