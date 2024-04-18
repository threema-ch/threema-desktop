import type {AnyReceiver} from '~/common/model';
import type {ReceiverDataFor} from '~/common/viewmodel/utils/receiver';

/**
 * Type of the props passed to each context menu item's handler callback.
 */
export interface ContextMenuItemHandlerProps<TReceiver extends AnyReceiver> {
    readonly edit: (receiver: ReceiverDataFor<TReceiver>) => Promise<void>;
}

export type TabState = 'contact' | 'group' | 'work-subscription-contact';
