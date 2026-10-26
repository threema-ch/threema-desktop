import {byteView} from '../byte/byte-view.js';
import type {u16} from '../integer/u16.js';

/**
 * Convert an 8-byte Uint8Array to a u16.
 *
 * @throws {Error} if array does not contain 2 bytes.
 */
export function bytesLeToU16(bytes: Uint8Array): u16 {
    if (bytes.byteLength !== 2) {
        throw new Error(
            `bytesLeToU16 failed: Value does not contain 2 bytes, but ${bytes.byteLength}`,
        );
    }
    return byteView(DataView, bytes).getUint16(0, true);
}
