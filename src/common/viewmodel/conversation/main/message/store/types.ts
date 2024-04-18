import type {DbContactUid} from '~/common/db';
import type {IdentityStringOrMe} from '~/common/model/types/message';
import type {MessageId} from '~/common/network/types';
import type {Dimensions, f64, u53} from '~/common/types';
import type {IdColor} from '~/common/utils/id-color';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';
import type {AnyMention} from '~/common/viewmodel/utils/mentions';

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `MessageProps` that the message component expects, excluding props that only
 * exist in the ui layer.
 */
export interface ConversationMessageViewModel {
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
    readonly lastEditedAt: Date | undefined;
    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;
    readonly quote?: ConversationMessageViewModelBundle | 'not-found' | undefined;
    readonly reactions: ReactionData[];
    readonly sender?: AnyMessageSender;
    readonly status: StatusData;
    readonly text?: {
        readonly mentions: AnyMention[];
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
    readonly sender: {
        readonly identity: IdentityStringOrMe;
        readonly name?: string;
    };
    readonly type: 'acknowledged' | 'declined';
}

/**
 * Data related to the message sender.
 */
type AnyMessageSender = SenderDataSelf | SenderDataContact;

interface SenderDataCommon {
    /** Color used as the backdrop. */
    readonly color: IdColor;
    /** Fallback initials if the profile picture is not provided or unavailable. */
    readonly initials: string;
    /** Full display name of the sender. */
    readonly name: string;
}

interface SenderDataSelf extends SenderDataCommon {
    readonly type: 'self';
}

interface SenderDataContact extends SenderDataCommon {
    readonly type: 'contact';
    readonly uid: DbContactUid;
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
}

interface StatusDetailData {
    /** When the status was reached. */
    readonly at: Date;
}
