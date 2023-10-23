import type {MessageDetailsModalProps} from '~/app/ui/components/partials/chat-view/internal/message-details-modal/props';
import type {MessageForwardModalProps} from '~/app/ui/components/partials/chat-view/internal/message-forward-modal/props';
import type {MessageMediaViewerModalProps} from '~/app/ui/components/partials/chat-view/internal/message-media-viewer-modal/props';

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
