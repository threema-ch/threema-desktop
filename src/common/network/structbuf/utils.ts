// This file has been generated by structbuf. Do not modify it!
import type * as types from '~/common/types';

/**
 * Expect that a value exists. Return it if it exists and throw if it doesn't.
 */
export function unwrap<T>(value: T | null | undefined): T {
    if (value === undefined || value === null) {
        throw new Error('Value should have been defined');
    }
    return value;
}

/**
 * Encode bytes from a source array or a function into an array.
 *
 * @param destination The array to encode into.
 * @param source An array or an encoder function.
 * @param offset The offset within the destination array.
 * @returns The amount of bytes written.
 */
export function encodeBytes(
    source: Uint8Array | Pick<types.ByteLengthEncoder, 'encode'>,
    destination: Uint8Array,
    offset: types.u53,
): types.u53 {
    if (source instanceof Uint8Array) {
        destination.set(source, offset);
        return source.byteLength;
    }
    return source.encode(destination.subarray(offset)).byteLength;
}

/**
 * Get the amount of bytes needed to copy a Uint8Array or run an encodable.
 *
 * @param source An array or an encoder function.
 * @returns The amount of bytes required.
 */
export function getByteLength(
    source: Uint8Array | Pick<types.ByteLengthEncoder, 'byteLength'>,
): types.u53 {
    if (source instanceof Uint8Array) {
        return source.byteLength;
    }
    return source.byteLength();
}

/**
 * Iterate over a sequence of chunks and execute a decode operation on each of them to retrieve the
 * chunk's value.
 *
 * @param source The source to decode from.
 * @param offset Start offset within the view.
 * @param chunkLength Length of each chunk to iterate over.
 * @param decode Function to decode a chunk and retrieve its value.
 * @yields A decoded chunk.
 */
export function* decodeIterable<T>(
    source: {byteLength: types.u53},
    offset: types.u53,
    chunkLength: types.u53,
    decode: (offset: types.u53) => T,
): IterableIterator<T> {
    while (offset < source.byteLength) {
        yield decode(offset);
        offset += chunkLength;
    }
}

/**
 * Iterate over a sequence of values and execute an encode operation on each of them to encode it
 * into a chunk.
 *
 * @param iterable The values to encode.
 * @param offset Start offset within the view.
 * @param chunkLength Length of each chunk to be encoded.
 * @param encode Function to encode the current value into a chunk.
 * @returns The total amount of bytes encoded.
 */
export function encodeIterable<T>(
    iterable: types.BoundedIterable<T>,
    offset: types.u53,
    chunkLength: types.u53,
    encode: (offset: types.u53, value: T) => void,
): types.u53 {
    let length = 0;
    for (const value of iterable) {
        encode(offset + length, value);
        length += chunkLength;
    }
    return length;
}
