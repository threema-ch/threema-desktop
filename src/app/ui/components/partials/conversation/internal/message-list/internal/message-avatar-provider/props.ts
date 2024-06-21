import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {DbContactUid} from '~/common/db';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `MessageAvatarProvider` component.
 */
export interface MessageAvatarProviderProps {
    readonly conversation: {
        readonly receiver: AnyReceiverData;
    };
    readonly direction: MessageProps['direction'];
    readonly sender?: NonNullable<MessageProps['sender']> &
        (
            | {
                  readonly type: 'self';
              }
            | {
                  readonly type: 'contact';
                  readonly uid: DbContactUid;
              }
        );
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'router'>;
}
