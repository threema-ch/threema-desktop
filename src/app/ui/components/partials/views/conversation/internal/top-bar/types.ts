import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';

export type ModalState = NoneModalState | ClearConversationModalState;

interface NoneModalState {
    readonly type: 'none';
}

interface ClearConversationModalState {
    readonly type: 'clear-conversation';
    readonly props: ClearConversationModalProps;
}
