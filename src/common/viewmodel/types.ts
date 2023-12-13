import type {
    VerificationLevel,
    VerificationLevelColors,
} from '#3sc/components/threema/VerificationDots';
import type {DbContactUid} from '~/common/db';

/**
 * Status of a message.
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'error';

/**
 * Contact data.
 */
export interface ContactData {
    readonly uid: DbContactUid;
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

// TODO(DESK-339): Replace with "..Action from 'svelte/action'"  on newer Svelte release
export interface SvelteAction {
    update?: () => void;
    destroy?: () => void;
}
