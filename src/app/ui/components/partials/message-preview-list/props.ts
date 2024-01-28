import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import type {IdColor} from '~/common/utils/id-color';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `MessagePreviewList` component.
 */
export interface MessagePreviewListProps {
    /**
     * Optional substring(s) to highlight in message preview text.
     */
    readonly highlights?: string | string[];
    readonly items: MessagePreviewListItemProps[];
    readonly services: Pick<AppServices, 'blobCache' | 'profilePicture' | 'router' | 'settings'>;
    readonly user?: {
        readonly color: IdColor;
        readonly initials: string;
        readonly picture?: ReadonlyUint8Array;
    };
}

interface MessagePreviewListItemProps {
    /**
     * The conversation which the messages are part of.
     */
    readonly conversation: {
        readonly receiver: Pick<AnyReceiverData, 'color' | 'initials' | 'name' | 'lookup' | 'type'>;
    };
    /**
     * Messages are grouped by receiver, which means each receiver (i.e., each list item) could have
     * multiple messages.
     */
    readonly messages: MessagePreviewProps[];
}

interface MessagePreviewProps {
    readonly direction: MessageProps['direction'];
    readonly file?: Omit<NonNullable<MessageProps['file']>, 'thumbnail'> & {
        readonly thumbnail?: Omit<
            NonNullable<NonNullable<MessageProps['file']>['thumbnail']>,
            'blobStore'
        >;
    };
    readonly id: MessageId;
    readonly quote?:
        | Omit<MessagePreviewProps, 'boundary' | 'conversation' | 'services'>
        | 'not-found';
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
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
