import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageSender} from '~/app/ui/components/partials/conversation/internal/message-list/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `MessageAvatarProvider` component.
 */
export interface MessageAvatarProviderProps {
    readonly conversation: {
        readonly receiver: AnyReceiverData;
    };
    readonly direction: MessageProps['direction'];
    readonly sender: MessageSender;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'router'>;
}
