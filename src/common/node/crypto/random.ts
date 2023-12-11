import * as crypto from 'node:crypto';

/**
 * Generate cryptographically secure random values.
 *
 * @param buffer Buffer to fill with random values.
 * @returns the filled buffer for convenience.
 */
export function randomBytes<T extends ArrayBufferView>(buffer: T): T {
    // The Node.js crypto.getRandomValues API has a quota that cannot be exceeded, so we need to
    // call it continuously until the buffer has been filled. See:
    // https://nodejs.org/api/webcrypto.html#cryptogetrandomvaluestypedarray
    const array =
        buffer instanceof Uint8Array
            ? buffer
            : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const length = buffer.byteLength;
    for (let offset = 0; offset < length; offset += 65536) {
        crypto.getRandomValues(array.subarray(offset, offset + 65536));
    }
    return buffer;
}
