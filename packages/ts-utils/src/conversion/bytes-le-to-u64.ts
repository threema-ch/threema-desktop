import {byteView} from '../byte/byte-view.js';
import type {u64} from '../integer/u64.js';

/**
 * Convert an 8-byte Uint8Array to a u64.
 *
 * @throws {Error} if array does not contain 8 bytes.
 */
export function bytesLeToU64(bytes: Uint8Array): u64 {
    if (bytes.byteLength !== 8) {
        throw new Error(
            `bytesLeToU64 failed: Value does not contain 8 bytes, but ${bytes.byteLength}`,
        );
    }
    return byteView(DataView, bytes).getBigUint64(0, true);
}
