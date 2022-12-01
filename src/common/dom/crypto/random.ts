/**
 * Generate cryptographically secure random values.
 *
 * @param buffer Buffer to fill with random values.
 * @returns the filled buffer for convenience.
 */
export function randomBytes<T extends ArrayBufferView>(buffer: T): T {
    // The Crypto.getRandomValues API has a quota that cannot be exceeded,
    // so we need to call it continuously until the buffer has been filled.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
    const array =
        buffer instanceof Uint8Array
            ? buffer
            : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const length = buffer.byteLength;
    for (let offset = 0; offset < length; offset += 65536) {
        self.crypto.getRandomValues(array.subarray(offset, offset + 65536));
    }
    return buffer;
}
