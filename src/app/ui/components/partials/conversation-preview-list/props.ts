import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ConversationPreviewList` component.
 */
export interface ConversationPreviewListProps {
    /**
     * Optional substring(s) to highlight in conversation preview text fields.
     */
    readonly highlights?: string | string[];
    readonly items: ConversationPreviewListItemProps[];
    readonly services: AppServices;
}

export interface ConversationPreviewListItemProps {
    readonly isArchived: boolean;
    readonly isPinned: boolean;
    readonly isPrivate: boolean;
    readonly lastMessage?: {
        readonly file?: Pick<NonNullable<MessageProps['file']>, 'type'>;
        readonly reactions: MessageProps['reactions'];
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
        readonly status: MessageProps['status'];
        readonly text?: TextContent;
    };
    readonly receiver: AnyReceiverData;
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
