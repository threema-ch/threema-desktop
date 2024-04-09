import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
import type {DeleteConversationModalProps} from '~/app/ui/components/partials/modals/delete-conversation-modal/props';

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
