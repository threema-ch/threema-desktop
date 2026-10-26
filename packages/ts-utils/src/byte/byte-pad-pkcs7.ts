import type {u8} from '@threema/ts-utils/integer/u8';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {ByteBuffer} from './byte-buffer.js';

/**
 * PKCS#7 padding.
 */
export type Pkcs7Padding = WeakOpaque<Uint8Array, {readonly Pkcs7Padding: unique symbol}>;

/**
 * Add a specific amount of PKCS#7 padding to a buffer or byte array.
 *
 * Note: The `length` is not validated. A length of `0` is invalid PKCS#7 padding and results in
 *       an empty padding.
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
