import type {AvatarProps} from '~/app/ui/components/atoms/avatar/props';
import type {Constraints} from '~/app/ui/components/atoms/lazy-image/types';
import type {ProseProps} from '~/app/ui/components/atoms/prose/props';
import type {BubbleProps} from '~/app/ui/components/molecules/message/internal/bubble/props';
import type {FileInfoProps} from '~/app/ui/components/molecules/message/internal/file-info/props';
import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {QuoteProps} from '~/app/ui/components/molecules/message/internal/quote/props';
import type {SenderProps} from '~/app/ui/components/molecules/message/internal/sender/props';
import type {BlobStore} from '~/common/dom/ui/blob-cache';
import type {Dimensions, f64} from '~/common/types';
import type {FileBytesAndMediaType} from '~/common/utils/file';

/**
 * Props accepted by the `Message` component.
 */
export interface MessageProps {
    /** Alt text for media previews, if needed. */
    readonly alt: string;
    /**
     * Whether clicking on the message should be enabled. Defaults to `false`.
     */
    readonly clickable?: boolean;
    /** Optional text content or caption of the message. */
    readonly content?: ProseProps['content'];
    readonly direction: 'inbound' | 'outbound';
    /** Optional file data, if this is a file-based message. */
    readonly file?: {
        readonly duration?: f64;
        /** Function to use for obtaining the file bytes. */
        readonly fetchFileBytes: () => Promise<FileBytesAndMediaType | undefined>;
        readonly imageRenderingType?: 'regular' | 'sticker';
        readonly mediaType: FileInfoProps['mediaType'];
        readonly name: FileInfoProps['name'];
        readonly sizeInBytes: FileInfoProps['sizeInBytes'];
        /** Optional thumbnail of the file, if it is previewable. */
        readonly thumbnail?: {
            /**
             * Optional override of thumbnail size constraints. If not provided, sane defaults will
             * be used.
             */
            readonly constraints?: Constraints;
            /**
             * Expected dimensions of the thumbnail image in its full size, used to render a
             * placeholder.
             */
            readonly expectedDimensions: Dimensions | undefined;
            /** Store that will eventually resolve to the thumbnail blob. */
            readonly blobStore: BlobStore;
            readonly mediaType: string;
        };
        /** Type of the file, used to control how its preview will be rendered. */
        readonly type: 'audio' | 'file' | 'image' | 'video';
    };
    /**
     * Whether to play an animation to bring attention to the message. Resets to `false` when the
     * animation is completed.
     */
    readonly highlighted?: BubbleProps['highlighted'];
    /**
     * An arbitrary string to display in the footer before the indicator symbols and the timestamp.
     */
    readonly footerHint?: string;
    readonly onError: (error: Error) => void;
    readonly options?: {
        readonly showSender?: boolean;
        readonly hideVideoPlayButton?: boolean;
        readonly indicatorOptions?: IndicatorProps['options'];
    };
    /** Data of the quoted message. */
    readonly quote?: DefaultQuoteProps | NotFoundQuoteProps | DeletedQuoteProps;
    readonly reactions: IndicatorProps['reactions'];
    /** Details about the message sender. */
    readonly sender?: Pick<AvatarProps, 'color' | 'initials'> & Pick<SenderProps, 'color' | 'name'>;
    readonly status: IndicatorProps['status'];
    /** Formatted timestamp of creation. */
    readonly timestamp: {
        /** Human-readable, textual representation of a relative date. */
        readonly fluent: string;
        /** Short representation of a timestamp, usually only the time itself. */
        readonly short: string;
    };
}

interface DefaultQuoteProps extends QuoteProps {
    readonly type: 'default';
}

interface NotFoundQuoteProps {
    readonly type: 'not-found';
    readonly fallbackText: string;
}

interface DeletedQuoteProps {
    readonly type: 'deleted';
    readonly fallbackText: string;
}
