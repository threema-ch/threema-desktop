import {
    type VerificationLevel,
    type VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import {type ProfilePictureView} from '~/common/model';
import {type u53} from '~/common/types';
import {type ProfilePictureData} from '~/common/viewmodel/profile-picture';

/**
 * Branding type.
 */
export type Branding = 'consumer' | 'work';

/**
 * Possible reactions towards a message.
 */
export type MessageReaction = 'acknowledged' | 'declined';

/**
 * Status of a message.
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'error';

/**
 * Dimensions for a 2D pixel-based object.
 */
export interface Dimensions {
    width: u53;
    height: u53;
}

/**
 * Message types.
 */
export type MessageType =
    | 'text'
    | 'image'
    | 'location'
    | 'audio'
    | 'video'
    | 'file'
    | 'poll'
    | 'quote';

/**
 * Contact data.
 */
export interface ContactData {
    /**
     * Optional badge of the receiver.
     */
    readonly badge?: 'contact-consumer' | 'contact-work';
    /**
     * Verification level.
     */
    readonly verificationLevel: VerificationLevel;
    /**
     * Verification level colors used.
     */
    readonly verificationLevelColors: VerificationLevelColors;
    /**
     * Whether this contact is being blocked.
     */
    readonly blocked: boolean;
}

/**
 * Group data.
 */
export interface GroupData {
    /**
     * List of group members.
     */
    readonly members: string[];
    /**
     * List of group member names.
     */
    readonly memberNames: string[];
    /**
     * Determinate if the user is part, kicked by or left the group
     */
    readonly userState: GroupUserState;
}

export type GroupUserState = 'member' | 'left' | 'kicked';

/**
 * Distribution list data.
 */
export interface DistributionListData {
    /**
     * List of distribution list members.
     */
    readonly members: string[];
}

/**
 * Receiver types
 */
export type ReceiverType = 'contact' | 'group' | 'distribution-list';

/**
 * Maps a receiver type to its associated raw data.
 */
export type ReceiverDataFor<T extends ReceiverType> = T extends 'contact'
    ? ContactData
    : T extends 'group'
    ? GroupData
    : T extends 'distribution-list'
    ? DistributionListData
    : never;

/**
 * Any kind of receiver data.
 */
export type AnyReceiverData =
    | ReceiverData<'contact'>
    | ReceiverData<'group'>
    | ReceiverData<'distribution-list'>;

/**
 * Receiver data abstraction.
 */
export type ReceiverData<T extends ReceiverType> = {
    /**
     * Receiver type.
     */
    type: T;
    /**
     * Name of the receiver.
     */
    name: string;
    /**
     * Profile picture of the receiver.
     */
    profilePicture: ProfilePictureData;
} & ReceiverDataFor<T>;

/**
 * Receiver badge types.
 */
export type ReceiverBadgeType = 'contact-consumer' | 'contact-work' | 'group' | 'distribution-list';

/**
 * State of the associated primary data (e.g. an image blob) of an inbound message.
 *
 * - remote: Data has not yet been downloaded.
 * - downloading: Data is being downloaded.
 * - local: Data is downloaded.
 * - failed: Download has permanently failed (e.g. when already deleted from blob server)
 */
export type InboundFileMessageState =
    | {readonly type: 'remote'}
    | {readonly type: 'downloading'; readonly progress: unknown}
    | {readonly type: 'local'}
    | {readonly type: 'failed'};

/**
 * State of the associated primary data (e.g. an image blob) of an outbound message.
 *
 * - local: Data has not yet been uploaded.
 * - uploading: Data is being uploaded.
 * - remote: Data is uploaded.
 * - failed: Upload has failed and can be retried by user.
 */
export type OutboundFileMessageState =
    | {readonly type: 'local'}
    | {readonly type: 'uploading'; readonly progress: unknown}
    | {readonly type: 'remote'}
    | {readonly type: 'failed'};

interface TextMessageBody {
    /**
     * Text.
     *
     * Note: This may not contain a quote and must not be parsed as a quote.
     */
    readonly text: string;
}

interface ImageMessageBody {
    /**
     * Thumbnail URL to be used. If not set, should fall back to an
     * appropriate image placeholder.
     */
    readonly thumbnail?: Promise<string>;

    /**
     * Optional caption of the image.
     */
    readonly caption?: string;
}

interface LocationMessageBody {
    /**
     * The latitude of the location.
     */
    readonly latitude: string;

    /**
     * The longitude of the location.
     */
    readonly longitude: string;

    /**
     * Optional description of the location.
     */
    readonly description?: string;

    /**
     * Optional address of the location.
     */
    readonly address?: string;
}

interface AudioMessageBody {
    /**
     * Audio URL to be used.
     */
    readonly audio: Promise<string>;

    /**
     * Audio file size in bytes.
     */
    readonly size: u53;

    /**
     * Optional duration in seconds.
     */
    readonly duration?: u53;

    /**
     * Optional caption of the audio.
     */
    readonly caption?: string;
}

interface VideoMessageBody {
    /**
     * Video URL to be used.
     */
    readonly video: Promise<string>;

    /**
     * Video file size in bytes.
     */
    readonly size: u53;

    /**
     * Thumbnail URL to be used. If not set, should fall back to an
     * appropriate video placeholder.
     */
    readonly thumbnail?: Promise<string>;

    /**
     * Optional duration in seconds.
     */
    readonly duration?: u53;

    /**
     * Optional caption of the video.
     */
    readonly caption?: string;

    /**
     * Optional dimensions of the video.
     */
    readonly dimensions?: Dimensions;
}

interface FileMessageBody {
    /**
     * Media type of the file.
     */
    readonly mediaType: string;

    /**
     * File size in bytes.
     */
    readonly size: u53;

    /**
     * Optional thumbnail URL to be used. If not set, will fall back to an icon
     * appropriate for the media type.
     */
    readonly thumbnail?: Promise<string>;

    /**
     * Optional filename to be displayed.
     */
    readonly filename?: string;

    /**
     * Optional caption of the file.
     */
    readonly caption?: string;
}

interface QuoteMessageBody {
    /**
     * Quoted message.
     */
    readonly quote: Exclude<Message<AnyMessageBody>, Message<MessageBody<'quote'>>>;

    /**
     * Text.
     *
     * Note: This may not contain a quote and must not be parsed as a quote.
     */
    readonly text: string;
}

/**
 * Maps a message type to its associated raw body type.
 */
export type MessageBodyFor<T extends MessageType> = T extends 'text'
    ? TextMessageBody
    : T extends 'image'
    ? ImageMessageBody
    : T extends 'location'
    ? LocationMessageBody
    : T extends 'audio'
    ? AudioMessageBody
    : T extends 'video'
    ? VideoMessageBody
    : T extends 'file'
    ? FileMessageBody
    : T extends 'quote'
    ? QuoteMessageBody
    : never;

/**
 * Body associated to a message type.
 */
export interface MessageBody<T extends MessageType> {
    readonly type: T;
    readonly body: MessageBodyFor<T>;
}

export type MessageDirection = 'incoming' | 'outgoing';

export type AnyMessageBody =
    | MessageBody<'text'>
    | MessageBody<'location'>
    | MessageBody<'audio'>
    | MessageBody<'image'>
    | MessageBody<'video'>
    | MessageBody<'file'>
    | MessageBody<'quote'>;

export interface Reaction {
    readonly at: Date;
    readonly type: MessageReaction;
}

export type IncomingMessage<B extends AnyMessageBody> = {
    readonly direction: 'incoming';
    readonly state: InboundFileMessageState;
    readonly id: string;
    readonly sender: ReceiverData<'contact'>;
    readonly isRead: boolean;
    readonly updatedAt: Date;
    readonly lastReaction?: Reaction;
} & B;

export type OutgoingMessage<B extends AnyMessageBody> = {
    readonly direction: 'outgoing';
    readonly state: OutboundFileMessageState;
    readonly id: string;
    readonly status: MessageStatus;
    readonly sender: {
        readonly name: string;
        readonly profilePicture: ProfilePictureView;
    };
    readonly updatedAt: Date;
    readonly lastReaction?: Reaction;
} & B;

export type Message<B extends AnyMessageBody> = IncomingMessage<B> | OutgoingMessage<B>;

// TODO(DESK-339): Replace with "..Action from 'svelte/action'"  on newer Svelte release
export interface SvelteAction {
    update?: () => void;
    destroy?: () => void;
}
