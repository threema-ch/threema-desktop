/**
 * Status of a message.
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'error';

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
