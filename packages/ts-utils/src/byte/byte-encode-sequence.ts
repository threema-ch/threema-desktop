import type {ByteEncoder} from './byte-encoder.js';

/**
 * Encode consecutively into an array.
 *
 * @param array The array to be encoded into.
 * @param encoders Sequence of encoders that will be called consecutively.
 * @returns The sub-array portion of the amount of bytes written into the array.
 */
export function byteEncodeSequence(
    array: Uint8Array,
    ...encoders: readonly ByteEncoder[]
): Uint8Array {
    let offset = 0;
    for (const encoder of encoders) {
        const encoded = encoder(array.subarray(offset));
        offset += encoded.byteLength;
    }
    return array.subarray(0, offset);
}
