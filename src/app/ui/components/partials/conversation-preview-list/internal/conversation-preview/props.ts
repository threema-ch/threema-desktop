import type {AppServicesForSvelte} from '~/app/types';
import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageSender} from '~/app/ui/components/partials/conversation/internal/message-list/types';
import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';
import type {ReceiverCardProps} from '~/app/ui/components/partials/receiver-card/props';
import type {SanitizeAndParseTextToHtmlOptions} from '~/app/ui/utils/text';
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
    readonly highlights?: string | readonly string[];
    readonly isArchived: boolean;
    readonly isPinned: boolean;
    readonly isTyping?: boolean;
    readonly isPrivate: boolean;
    readonly lastMessage?: {
        readonly direction: 'inbound' | 'outbound';
        readonly file?: Pick<NonNullable<MessageProps['file']>, 'type'>;
        readonly sender: MessageSender;
        readonly status: IndicatorProps['status'];
        readonly text?: TextContent;
    };
    readonly popover?: ContextMenuProviderProps['popover'];
    readonly receiver: AnyReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'router' | 'settings'>;
    readonly totalMessageCount: u53;
    readonly unreadMessageCount?: ReceiverCardProps['unreadMessageCount'];
}

interface TextContent {
    readonly mentions?: SanitizeAndParseTextToHtmlOptions['mentions'];
    /** Raw, unparsed, text. */
    readonly raw: string;
}
