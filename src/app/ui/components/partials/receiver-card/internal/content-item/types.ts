import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';
import type {TagsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/tags/props';
import type {TimestampProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/timestamp/props';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Configuration options for a `ContentItem` in a `ReceiverCard`.
 */
export type AnyContentItemOptions =
    | CharmsContentItemOptions
    | ReceiverNameContentItemOptions
    | StatusContentItemOptions
    | TagsContentItemProps
    | TextContentItemOptions
    | TimestampContentItemOptions
    | VerificationContentItemOptions;

export interface CharmsContentItemOptions extends CharmsProps {
    readonly type: 'charms';
}

export interface ReceiverNameContentItemOptions {
    readonly type: 'receiver-name';
    readonly receiver: AnyReceiverData;
}

export interface StatusContentItemOptions extends IndicatorProps {
    readonly type: 'status-icon';
}

export interface TagsContentItemProps extends TagsProps {
    readonly type: 'tags';
}

export interface TextContentItemOptions {
    readonly type: 'text';
    readonly text: string;
    readonly decoration?: 'strikethrough' | 'semi-transparent';
}

export interface TimestampContentItemOptions extends TimestampProps {
    readonly type: 'relative-timestamp';
}

export interface VerificationContentItemOptions {
    readonly type: 'verification-dots';
    readonly receiver: Pick<AnyReceiverData & {type: 'contact'}, 'verification'>;
}
