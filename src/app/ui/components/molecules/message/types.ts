import type {ReadonlyUint8Array} from '~/common/types';

/**
 * Payload of a file thumbnail.
 */
export interface ThumbnailPayload {
    readonly bytes: ReadonlyUint8Array;
}

/**
 * Payload of file data.
 */
export interface FilePayload {
    readonly bytes: ReadonlyUint8Array;
    readonly fileName: string;
    readonly mediaType: string;
}
