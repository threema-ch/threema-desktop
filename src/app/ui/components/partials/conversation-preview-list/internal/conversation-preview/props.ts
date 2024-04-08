import type {AppServices} from '~/app/types';
import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';
import type {ReceiverCardProps} from '~/app/ui/components/partials/receiver-card/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
import type {DbContactUid} from '~/common/db';
import type {u53} from '~/common/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ConversationPreview` component.
 */
export interface ConversationPreviewProps {
    readonly active: boolean;
    readonly call?: CharmsProps['call'];
    readonly contextMenuOptions?: Omit<ContextMenuProviderProps, 'popover'>;
    /**
     * Optional substring(s) to highlight in conversation preview text fields.
     */
    readonly highlights?: string | string[];
    readonly isArchived: boolean;
    readonly isPinned: boolean;
    readonly isPrivate: boolean;
    readonly lastMessage?: {
        readonly file?: Pick<NonNullable<MessageProps['file']>, 'type'>;
        readonly reactions: IndicatorProps['reactions'];
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
        readonly status: IndicatorProps['status'];
        readonly text?: TextContent;
        readonly deletedAt: MessageProps['deletedAt'];
    };
    readonly popover?: ContextMenuProviderProps['popover'];
    readonly receiver: AnyReceiverData;
    readonly services: Pick<AppServices, 'profilePicture' | 'router' | 'settings'>;
    readonly totalMessageCount: u53;
    readonly unreadMessageCount?: ReceiverCardProps['unreadMessageCount'];
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
