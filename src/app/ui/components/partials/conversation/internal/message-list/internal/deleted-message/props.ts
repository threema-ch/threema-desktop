import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/props';
import type {DbContactUid} from '~/common/db';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `DeletedMessage` component.
 */
export interface DeletedMessageProps {
    readonly boundary?: MessageContextMenuProviderProps['boundary'];
    readonly conversation: {
        readonly receiver: AnyReceiverData;
    };
    readonly direction: BasicMessageProps['direction'];
    /**
     * Whether to play an animation to bring attention to the message. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: BasicMessageProps['highlighted'];
    readonly sender?: NonNullable<BasicMessageProps['sender']> &
        (
            | {
                  readonly type: 'self';
              }
            | {
                  readonly type: 'contact';
                  readonly uid: DbContactUid;
              }
        );
    readonly services: AppServicesForSvelte;
    readonly status: BasicMessageProps['status'];
}
