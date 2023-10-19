import type {MessageDetailsModalProps} from '~/app/ui/components/partials/chat-view/internal/message-details-modal/props';
import type {MessageForwardModalProps} from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/props';
import type {MessageMediaViewerModalProps} from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/props';
import type {ChatViewProps} from '~/app/ui/components/partials/chat-view/props';

export interface UnreadState {
    readonly firstUnreadMessageId: ChatViewProps['conversation']['firstUnreadMessageId'];
    readonly hasIncomingUnreadMessages: boolean;
    /**
     * Whether any outgoing messages have been changed (added or deleted) since opening the
     * conversation.
     */
    readonly hasOutgoingMessageChangesSinceOpened: boolean;
}

export type ModalState =
    | NoneModalState
    | MessageDetailsModalState
    | MessageForwardModalState
    | MessageMediaViewerModalState;

interface NoneModalState {
    type: 'none';
}

interface MessageDetailsModalState {
    type: 'message-details';
    props: MessageDetailsModalProps;
}

interface MessageForwardModalState {
    type: 'message-forward';
    props: MessageForwardModalProps;
}

interface MessageMediaViewerModalState {
    type: 'message-media-viewer';
    props: MessageMediaViewerModalProps;
}
