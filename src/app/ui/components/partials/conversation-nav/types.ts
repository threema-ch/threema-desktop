import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
import type {DeleteConversationModalProps} from '~/app/ui/components/partials/modals/delete-conversation-modal/props';
import type {Remote} from '~/common/utils/endpoint';
import type {ConversationListViewModelBundle} from '~/common/viewmodel/conversation/list';
import type {ConversationListItemViewModelBundle} from '~/common/viewmodel/conversation/list/item';
import type {ProfileViewModelStore} from '~/common/viewmodel/profile';

/**
 * Type of the value contained in a `ConversationListViewModelStore` transferred from {@link Remote}.
 */
export type RemoteConversationListViewModelStoreValue = ReturnType<
    Remote<ConversationListViewModelBundle>['viewModelStore']['get']
>;

/**
 * Type of the value contained in a `ProfileViewModelStore` transferred from {@link Remote}.
 */
export type RemoteProfileViewModelStoreValue = ReturnType<Remote<ProfileViewModelStore>['get']>;

/**
 * Type of the props passed to each context menu item's handler callback.
 */
export interface ContextMenuItemHandlerProps {
    readonly viewModelBundle: Remote<ConversationListItemViewModelBundle>;
}

export type ModalState =
    | NoneModalState
    | ClearConversationModalState
    | DeleteConversationModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface ClearConversationModalState {
    readonly type: 'clear-conversation';
    readonly props: ClearConversationModalProps;
}

interface DeleteConversationModalState {
    readonly type: 'delete-conversation';
    readonly props: DeleteConversationModalProps;
}
