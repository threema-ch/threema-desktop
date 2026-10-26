import {byteView} from '../byte/byte-view.js';
import type {u64} from '../integer/u64.js';

import {bytesToHex} from './bytes-to-hex.js';

/**
 * Convert a u64 to a little endian hex string.
 *
 * @param value Unsigned 64-bit integer to be converted
 * @returns the value as little endian hex string (16 characters).
 */
export function u64ToHexLe(value: u64): string {
    const array = new Uint8Array(8);
    byteView(DataView, array).setBigUint64(0, value, true);
    return bytesToHex(array);
}
