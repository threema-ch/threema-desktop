import type {AppServices} from '~/app/types';
import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/chat-view/internal/message-context-menu-provider/props';
import type {MessageDetailsModalProps} from '~/app/ui/components/partials/chat-view/internal/message-details-modal/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {ReceiverType} from '~/common/enum';
import type {MessageId} from '~/common/network/types';
import type {FileMessageDataState} from '~/common/viewmodel/types';

/**
 * Props accepted by the `Message` component.
 */
export interface MessageProps {
    readonly actions: {
        readonly acknowledge: () => Promise<void>;
        readonly decline: () => Promise<void>;
    };
    readonly boundary?: MessageContextMenuProviderProps['boundary'];
    readonly conversation: {
        readonly type: ReceiverType;
        readonly isBlocked: boolean;
        readonly isDisabled: boolean;
    };
    readonly direction: BasicMessageProps['direction'];
    readonly file?: NonNullable<BasicMessageProps['file']> & {
        readonly sync: {
            /**
             * Whether the message content (i.e. file data) has been synced.
             */
            readonly state: FileMessageDataState['type'];
            /**
             * The sync direction for unsynced or syncing messages.
             */
            readonly direction: 'upload' | 'download' | undefined;
        };
    };
    /**
     * Whether to play an animation to bring attention to the message. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: BasicMessageProps['highlighted'];
    readonly id: MessageId;
    readonly quote?: Omit<MessageProps, 'boundary' | 'conversation' | 'services'> | 'not-found';
    readonly reactions: MessageDetailsModalProps['reactions'];
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
    readonly services: AppServices;
    readonly status: BasicMessageProps['status'];
    readonly text?: TextContent;
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
