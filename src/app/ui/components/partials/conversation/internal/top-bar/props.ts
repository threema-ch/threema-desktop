import type {AppServices} from '~/app/types';
import type {ClearConversationModalProps} from '~/app/ui/components/partials/modals/clear-conversation-modal/props';
import type {ReceiverCardProps} from '~/app/ui/components/partials/receiver-card/props';
import type {u53} from '~/common/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `TopBar` component.
 */
export interface TopBarProps {
    /** Details of the conversation related to this receiver. */
    readonly conversation: ClearConversationModalProps['conversation'] & {
        readonly archive: () => Promise<void>;
        readonly isArchived: boolean;
        readonly isPinned: boolean;
        readonly pin: () => Promise<void>;
        readonly totalMessagesCount: u53;
        readonly unarchive: () => Promise<void>;
        readonly unpin: () => Promise<void>;
    };
    readonly receiver: AnyReceiverData;
    readonly services: ReceiverCardProps['services'] & Pick<AppServices, 'router'>;
}