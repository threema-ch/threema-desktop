import type {AppServicesForSvelte} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/props';
import type {MessageDetailsModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {MessageId} from '~/common/network/types';
import type {FileMessageDataState} from '~/common/viewmodel/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `RegularMessage` component.
 */
export interface RegularMessageProps {
    readonly actions: {
        readonly acknowledge: (() => Promise<void>) | undefined;
        readonly decline: (() => Promise<void>) | undefined;
        readonly edit: ((newText: string) => Promise<void>) | undefined;
    };
    readonly boundary?: MessageContextMenuProviderProps['boundary'];
    readonly conversation: {
        readonly receiver: AnyReceiverData;
        readonly isEditingSupported: boolean;
    };
    readonly direction: MessageProps['direction'];
    readonly file?: Omit<NonNullable<MessageProps['file']>, 'thumbnail'> & {
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
        readonly thumbnail?: Omit<
            NonNullable<NonNullable<MessageProps['file']>['thumbnail']>,
            'blobStore'
        >;
    };
    /**
     * Whether to play an animation to bring attention to the message. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: MessageProps['highlighted'];
    readonly id: MessageId;
    readonly quote?: AnyQuotedMessage;
    readonly reactions: MessageProps['reactions'] & MessageDetailsModalProps['reactions'];
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
    readonly services: AppServicesForSvelte;
    readonly status: MessageProps['status'];
    readonly text?: TextContent;
}

export type AnyQuotedMessage = QuotedRegularMessage | QuotedDeletedMessage | 'not-found';

interface QuotedRegularMessage
    extends Omit<RegularMessageProps, 'boundary' | 'conversation' | 'services'> {
    readonly type: 'regular-message';
}

interface QuotedDeletedMessage {
    readonly type: 'deleted-message';
    readonly id: MessageId;
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
