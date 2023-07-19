/**
 * Protocol constants that don't fit into another more specific location.
 */

import {ensureNonce} from '~/common/crypto';

/**
 * Minimal bytes of a PKCS7 padded message.
 */
export const MESSAGE_DATA_PADDING_LENGTH_MIN = 32;

/**
 * Constant nonce used for encrypting files sent via blob server.
 *
 * IMPORTANT: This MUST be used with a random key!
 */
export const BLOB_FILE_NONCE = ensureNonce(
    // prettier-ignore
    new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
    ]),
);

/**
 * Constant nonce used for encrypting thumbnails sent via blob server.
 *
 * IMPORTANT: This MUST be used with a random key!
 */
export const BLOB_THUMBNAIL_NONCE = ensureNonce(
    // prettier-ignore
    new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 2,
    ]),
);

/**
 * Max size for media message thumbnails.
 */
export const THUMBNAIL_MAX_SIZE = 512;
