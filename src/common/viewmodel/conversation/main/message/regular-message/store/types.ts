import type {DbContactUid} from '~/common/db';
import type {MessageId} from '~/common/network/types';
import type {Dimensions, f64, u53} from '~/common/types';
import type {ConversationRegularMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message/regular-message';
import type {AnyMention} from '~/common/viewmodel/utils/mentions';
import type {ContactReceiverData} from '~/common/viewmodel/utils/receiver';
import type {AnySender, SenderDataSelf} from '~/common/viewmodel/utils/sender';

/** @deprecated */
interface DeprecatedSenderDataContact
    extends Pick<ContactReceiverData, 'type' | 'color' | 'initials' | 'name'> {
    readonly uid: DbContactUid;
}

/**
 * Data related to the message sender.
 *
 * TODO(DESK-770): Remove and replace all usages with `AnySender` instead.
 *
 * @deprecated Use {@link AnySender} instead.
 */
type AnyMessageSender = SenderDataSelf | DeprecatedSenderDataContact;

/**
 * Data related to a single message reaction.
 */
interface ReactionData {
    readonly at: Date;
    readonly direction: 'inbound' | 'outbound';
    readonly sender: AnySender;
    readonly type: 'acknowledged' | 'declined';
}

/**
 * Data about the status of a message.
 */
interface StatusData {
    readonly created: StatusDetailData;
    readonly received?: StatusDetailData;
    readonly sent?: StatusDetailData;
    readonly delivered?: StatusDetailData;
    readonly read?: StatusDetailData;
    readonly error?: StatusDetailData;
    readonly deleted?: StatusDetailData;
    readonly edited?: StatusDetailData;
}

interface StatusDetailData {
    /** When the status was reached. */
    readonly at: Date;
}

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `MessageProps` that the message component expects, excluding props that only
 * exist in the ui layer.
 */
export interface ConversationRegularMessageViewModel {
    readonly type: 'message';
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
    readonly quote?: ConversationRegularMessageViewModelBundle | 'not-found' | undefined;
    readonly reactions: readonly ReactionData[];
    readonly sender?: AnyMessageSender;
    readonly status: StatusData;
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
