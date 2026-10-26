import {byteView} from '../byte/byte-view.js';
import type {u16} from '../integer/u16.js';

/**
 * Convert a u16 to an 2-byte Uint8Array.
 */
export function u16ToBytesLe(value: u16): Uint8Array {
    const array = new Uint8Array(2);
    byteView(DataView, array).setUint16(0, value, true);
    return array;
}
