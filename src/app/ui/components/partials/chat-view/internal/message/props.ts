import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/chat-view/internal/message-context-menu-provider/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbReceiverLookup} from '~/common/db';
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
    readonly conversation: Conversation;
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
    readonly id: MessageId;
    readonly quote?: Omit<MessageProps, 'boundary' | 'conversation'> | 'not-found';
    readonly reactions: BasicMessageProps['reactions'];
    readonly sender: BasicMessageProps['sender'];
    readonly status: BasicMessageProps['status'];
    readonly text?: TextContent;
}

interface Conversation {
    readonly type: ReceiverType;
    readonly isBlocked: boolean;
    readonly receiverLookup: DbReceiverLookup;
    readonly lastMessageId: MessageId | undefined;
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
