import type {AvatarProps} from '~/app/ui/components/atoms/avatar/props';
import type {ProseProps} from '~/app/ui/components/atoms/prose/props';
import type {FileInfoProps} from '~/app/ui/components/molecules/message/internal/file-info/props';
import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {QuoteProps} from '~/app/ui/components/molecules/message/internal/quote/props';
import type {SenderProps} from '~/app/ui/components/molecules/message/internal/sender/props';
import type {Dimensions, ReadonlyUint8Array, f64} from '~/common/types';

/**
 * Props accepted by the `Message` component.
 */
export interface MessageProps {
    /** Alt text for media previews, if needed. */
    readonly alt: string;
    /** Optional text content or caption of the message. */
    readonly content?: ProseProps['content'];
    readonly direction: 'inbound' | 'outbound';
    /** Optional file data, if this is a file-based message. */
    readonly file?: {
        readonly duration?: f64;
        /** Function to use for obtaining the file bytes. */
        readonly fetchFileBytes: () => Promise<ReadonlyUint8Array | undefined>;
        readonly imageRenderingType?: 'regular' | 'sticker';
        readonly mediaType: FileInfoProps['mediaType'];
        readonly name: FileInfoProps['name'];
        readonly sizeInBytes: FileInfoProps['sizeInBytes'];
        /** Optional thumbnail of the file, if it is previewable. */
        readonly thumbnail?: {
            /**
             * Expected dimensions of the thumbnail image in its full size, used to render a
             * placeholder.
             */
            readonly expectedDimensions: Dimensions | undefined;
            /** Function to use for obtaining the thumbnail image bytes. */
            readonly fetchThumbnailBytes: () => Promise<ReadonlyUint8Array | undefined>;
            readonly mediaType: string;
        };
        /** Type of the file, used to control how its preview will be rendered. */
        readonly type: 'audio' | 'file' | 'image' | 'video';
    };
    readonly onError: (error: Error) => void;
    readonly options?: {
        readonly hideSender?: boolean;
        readonly hideStatus?: IndicatorProps['hideStatus'];
        readonly hideVideoPlayButton?: boolean;
    };
    /** Data of the quoted message. */
    readonly quote?: DefaultQuoteProps | NotFoundQuoteProps;
    readonly reactions?: IndicatorProps['reactions'];
    /** Details about the message sender. */
    readonly sender?: Pick<AvatarProps, 'bytes' | 'color' | 'initials'> &
        Pick<SenderProps, 'color' | 'name'>;
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
