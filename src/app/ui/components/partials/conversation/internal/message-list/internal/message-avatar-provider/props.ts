import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {DbContactUid} from '~/common/db';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `MessageAvatarProvider` component.
 */
export interface MessageAvatarProviderProps {
    readonly conversation: {
        readonly receiver: AnyReceiverData;
    };
    readonly direction: BasicMessageProps['direction'];
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
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'router'>;
}
