import {
    type VerificationLevel,
    type VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import {type MessageDirection, type MessageReaction} from '~/common/enum';
import {type ProfilePictureView} from '~/common/model';
import {type u53} from '~/common/types';
import {type ProfilePictureData} from '~/common/viewmodel/profile-picture';

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
    readonly badge?: ReceiverBadgeType;
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
    readonly isBlocked: boolean;
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
}

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
 * State of the associated primary data (e.g. an image blob) of an inbound or outbound message.
 *
 * - unsynced: The file is available only locally (for outgoing messages) or only on the blob server
 *   (for incoming or reflected messages).
 * - syncing: The file is being uploaded (for outgoing messages) or downloaded (for incoming or
 *   reflected messages).
 * - synced: The file was up- or downloaded successfully.
 * - failed: The up- or download failed and should not be retried (e.g. when the blob download
 *   returns a 404).
 */
export type FileMessageDataState =
    | {readonly type: 'unsynced'}
    | {readonly type: 'syncing'; readonly progress: unknown}
    | {readonly type: 'synced'}
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
    readonly direction: MessageDirection.INBOUND;
    readonly id: string;
    readonly sender: ReceiverData<'contact'>;
    readonly isRead: boolean;
    readonly updatedAt: Date;
    readonly lastReaction?: Reaction;
    // The state field is only relevant for file messages. For all other messages,
    // it can be set to 'synced'.
    readonly state: FileMessageDataState;
} & B;

export type OutgoingMessage<B extends AnyMessageBody> = {
    readonly direction: MessageDirection.OUTBOUND;
    readonly id: string;
    readonly status: MessageStatus;
    readonly sender: {
        readonly type: 'self';
        readonly name: string;
        readonly profilePicture: ProfilePictureView;
    };
    readonly updatedAt: Date;
    readonly lastReaction?: Reaction;
    // The state field is only relevant for file messages. For all other messages,
    // it can be set to 'synced'.
    readonly state: FileMessageDataState;
} & B;

export type Message<B extends AnyMessageBody> = IncomingMessage<B> | OutgoingMessage<B>;

// TODO(DESK-339): Replace with "..Action from 'svelte/action'"  on newer Svelte release
export interface SvelteAction {
    update?: () => void;
    destroy?: () => void;
}
