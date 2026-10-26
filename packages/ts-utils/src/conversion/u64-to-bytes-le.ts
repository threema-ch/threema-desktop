import {byteView} from '../byte/byte-view.js';
import type {u64} from '../integer/u64.js';

/**
 * Convert a u64 to an 8-byte Uint8Array.
 */
export function u64ToBytesLe(value: u64): Uint8Array {
    const array = new Uint8Array(8);
    byteView(DataView, array).setBigUint64(0, value, true);
    return array;
}
