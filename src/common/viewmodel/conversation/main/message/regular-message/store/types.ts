import type {MessageId} from '~/common/network/types';
import type {Dimensions, f64, u53} from '~/common/types';
import type {
    AnyConversationMessageViewModelBundle,
    DeprecatedAnySenderData,
    MessageStatusData,
} from '~/common/viewmodel/conversation/main/message/helpers';
import type {ConversationStatusMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/status-message';
import type {AnyMention} from '~/common/viewmodel/utils/mentions';
import type {AnySenderData} from '~/common/viewmodel/utils/sender';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `MessageProps` that the message component expects, excluding props that only
 * exist in the ui layer.
 */
export interface ConversationRegularMessageViewModel {
    readonly type: 'regular-message';
    readonly direction: 'inbound' | 'outbound';
    readonly file?: {
        readonly duration?: f64;
        readonly imageRenderingType?: 'regular' | 'sticker';
        readonly mediaType: string;
        readonly name: {
            /**
             * Default file name used as a fallback if the raw name is empty or `undefined`.
             */
            readonly default: string;
            /**
             * The raw (original) file name.
             */
            readonly raw?: string;
        };
        readonly sizeInBytes: u53;
        readonly sync: {
            readonly state: 'unsynced' | 'syncing' | 'synced' | 'failed';
            readonly direction: 'upload' | 'download' | undefined;
        };
        readonly thumbnail?: {
            /**
             * Expected dimensions of the thumbnail image in its full size, used to render a
             * placeholder.
             */
            readonly expectedDimensions: Dimensions | undefined;
            readonly mediaType: string;
        };
        readonly type: 'audio' | 'file' | 'image' | 'video';
    };
    readonly id: MessageId;
    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;
    readonly quote?:
        | Exclude<AnyConversationMessageViewModelBundle, ConversationStatusMessageViewModelBundle>
        | 'not-found'
        | undefined;

    readonly reactions: readonly ReactionData[];
    readonly sender?: DeprecatedAnySenderData;
    readonly status: MessageStatusData;
    readonly text?: {
        readonly mentions: readonly AnyMention[];
        /** Raw, unparsed, text. */
        readonly raw: string;
    };
    readonly history: {
        readonly editedAt: Date;
        readonly text: string;
    }[];
}

/**
 * Data related to a single message reaction.
 */
interface ReactionData {
    readonly at: Date;
    readonly direction: 'inbound' | 'outbound';
    readonly sender: AnySenderData;
    readonly type: 'acknowledged' | 'declined';
}
