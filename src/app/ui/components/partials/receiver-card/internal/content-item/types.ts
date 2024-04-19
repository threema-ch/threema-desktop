import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';
import type {TagsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/tags/props';
import type {TimestampProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/timestamp/props';
import type {SanitizedHtml} from '~/app/ui/utils/text';
import type {AnyReceiverData, ContactReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Configuration options for a `ContentItem` in a `ReceiverCard`.
 */
export type AnyContentItemOptions =
    | BlockedIndicatorContentItem
    | CharmsContentItemOptions
    | ReceiverNameContentItemOptions
    | StatusContentItemOptions
    | TagsContentItemOptions
    | TextContentItemOptions
    | TimestampContentItemOptions
    | VerificationContentItemOptions;

export interface BlockedIndicatorContentItem {
    readonly type: 'blocked-icon';
    readonly isBlocked: boolean;
}

export interface CharmsContentItemOptions extends CharmsProps {
    readonly type: 'charms';
}

export interface ReceiverNameContentItemOptions {
    readonly type: 'receiver-name';
    readonly receiver: AnyReceiverData;
    /**
     * Substrings to highlight.
     */
    readonly highlights?: string | string[];
}

export interface StatusContentItemOptions extends IndicatorProps {
    readonly type: 'status-icon';
}

export interface TagsContentItemOptions extends TagsProps {
    readonly type: 'tags';
}

export interface TextContentItemOptions {
    readonly type: 'text';
    readonly text:
        | {
              readonly raw: string;
          }
        | {
              readonly html: SanitizedHtml;
          };
    readonly decoration?: 'strikethrough' | 'semi-transparent';
}

export interface TimestampContentItemOptions extends TimestampProps {
    readonly type: 'relative-timestamp';
}

export interface VerificationContentItemOptions {
    readonly type: 'verification-dots';
    readonly receiver: Pick<ContactReceiverData, 'verification'>;
}
