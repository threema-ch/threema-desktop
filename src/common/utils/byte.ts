import {
    type ByteEncoder,
    ensureU8,
    type ReadonlyUint8Array,
    type u8,
    type u53,
    type WeakOpaque,
} from '~/common/types';
import {unwrap} from '~/common/utils/assert';
import {ByteBuffer} from '~/common/utils/byte-buffer';

/**
 * PKCS#7 padding.
 */
export type Pkcs7Padding = WeakOpaque<Uint8Array, {readonly Pkcs7Padding: unique symbol}>;

// prettier-ignore
const HEX_LOOKUP_TABLE = [
    '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
] as const;

/**
 * Test whether two Uint8Arrays are equal to each other.
 *
 * @returns Whether the Uint8Arrays are equal.
 */
export function byteEquals(left: ReadonlyUint8Array, right: ReadonlyUint8Array): boolean {
    if (left.byteLength !== right.byteLength) {
        return false;
    }
    return left.every((value, index) => value === right[index]);
}

/**
 * Convert an Uint8Array to a 0-padded lowercase hex string.
 *
 * @param array Array to convert
 * @param prefix Prefix string for each byte
 * @returns String as hex
 */
export function bytesToHex(array: ReadonlyUint8Array, prefix = ''): string {
    return array.reduce(
        /* eslint-disable no-bitwise */
        (parts, value) =>
            parts + prefix + HEX_LOOKUP_TABLE[value >>> 4] + HEX_LOOKUP_TABLE[value & 0x0f],
        '',
        /* eslint-enable no-bitwise */
    );
}

/**
 * Convert a single byte to a 0-padded lowercase hex string.
 *
 * Validation can be turned off, if you've already ensured that the input is a valid u8. However,
 * because casting a number to u8 can be done implicitly by accident, validation is enabled by
 * default.
 *
 * @param byte Byte to convert
 * @param validate Whether to sanity-check that the input byte is in the range [0, 255]
 * @returns String as hex
 */
export function byteToHex(byte: u8, validate = true): string {
    if (validate) {
        ensureU8(byte);
    }
    /* eslint-disable no-bitwise */
    return unwrap(HEX_LOOKUP_TABLE[byte >>> 4]) + unwrap(HEX_LOOKUP_TABLE[byte & 0x0f]);
    /* eslint-enable no-bitwise */
}

/**
 * Parse a hex string and return a Uint8Array.
 *
 * Note: This function validates the input and won't accept input strings with odd number of
 *       characters or with non-hex characters. For very fast hex decoding of long strings that are
 *       known to contain valid hexadecimal data, a function with less validation may be preferred.
 *
 * @param hexString Hex string (either upper- or lowercase)
 * @returns Uint8Array containing the bytes
 * @throws {Error} if decoding fails or if the input string contains non-hex characters
 */
export function hexToBytes(hexString: string): Uint8Array {
    if (hexString.length % 2 !== 0) {
        throw new Error('Hex string must contain an even number of characters');
    }

    const byteCount = hexString.length / 2;
    const array = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
        const hexPair = hexString.substring(i * 2, i * 2 + 2);

        // Ensure that hex string contains valid hexadecimal characters only
        for (let j = 0; j < hexPair.length; j++) {
            const cc = hexPair.charCodeAt(j);
            if (cc < 48 || (cc > 57 && cc < 65) || (cc > 70 && cc < 97) || cc > 102) {
                throw new Error(`Invalid hex character: ${hexPair[j]}`);
            }
        }

        // Convert hex string to byte. Note that we don't need to check for NaN thanks to the input
        // validation above.
        array[i] = parseInt(hexPair, 16);
    }
    return array;
}

/**
 * Encode consecutively into an array.
 *
 * @param array The array to be encoded into.
 * @param encoders Sequence of encoders that will be called consecutively.
 * @returns The sub-array porition of the amount of bytes written into the array.
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

/**
 * Get a (different type of) view from a source view.
 *
 * @param class_ The view class we want to make an instance of.
 * @param source The source view to create a new view for.
 * @returns A view instance of type `class_` to the array with the exact same underlying buffer,
 *   offset and length.
 */
export function byteView<TView>(
    class_: new (buffer: ArrayBufferLike, byteOffset?: u53, byteLength?: u53) => TView,
    source: ArrayBufferView,
): TView {
    // eslint-disable-next-line new-cap
    return new class_(source.buffer, source.byteOffset, source.byteLength);
}

/**
 * Join byte arrays by copying the bytes into a new array.
 */
export function byteJoin(...arrays: readonly ReadonlyUint8Array[]): Uint8Array {
    const output = new Uint8Array(arrays.reduce((length, array) => length + array.byteLength, 0));
    let offset = 0;
    for (const array of arrays) {
        output.set(array, offset);
        offset += array.byteLength;
    }
    return output;
}

/**
 * Split bytes into an array of byte views of a specific maximum chunk length.
 */
export function* byteSplit<T extends ReadonlyUint8Array>(
    array: T,
    maxChunkLength: u53,
): IterableIterator<ReadonlyUint8Array> {
    for (let offset = 0; offset < array.byteLength; offset += maxChunkLength) {
        yield array.subarray(offset, offset + maxChunkLength);
    }
}

/**
 * Add a specific amount of PKCS#7 padding to a buffer or byte array.
 *
 * @throws {Error} If the `destination` buffer is claimed.
 * @throws {Error} If the requested length is longer than the available `destination` size.
 */
export function bytePadPkcs7(destination: ByteBuffer | Uint8Array, length: u8): Pkcs7Padding {
    let array: Uint8Array;
    if (destination instanceof ByteBuffer) {
        array = destination.bytes(length);
    } else {
        if (length > destination.byteLength) {
            throw new Error(`Requested length ${length} is larger than the destination array size`);
        }
        array = destination.subarray(0, length);
    }
    return array.fill(length) as Pkcs7Padding;
}

/**
 * Create a view excluding any PKCS#7 padding from a byte array.
 *
 * @throws {Error} If the PKCS#7 padding byte is invalid.
 */
export function byteWithoutPkcs7<T extends ReadonlyUint8Array>(array: T): T {
    const length = array.byteLength;
    const end = length - unwrap(array[length - 1], 'No PKCS#7 padding, input is empty');
    if (end < 0) {
        throw new Error(`Invalid PKCS#7 padding byte '${end}' for bytes of length ${length}`);
    }
    return array.subarray(0, end) as T;
}

/**
 * Return a view of the byte array, ignoring any zeroes at the end.
 */
export function byteWithoutZeroPadding<T extends ReadonlyUint8Array>(array: T): T {
    for (let offset = array.byteLength; offset > 0; --offset) {
        if (array[offset - 1] !== 0x0) {
            return array.subarray(0, offset) as T;
        }
    }
    return array.subarray(0, 0) as T;
}
