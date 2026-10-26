import {byteView} from '../byte/byte-view.js';
import type {u64} from '../integer/u64.js';
import {ensureError} from '../meta/ensure-error.js';

import {hexToBytes} from './hex-to-bytes.js';

/**
 * Convert a hex-encoded little-endian string to a u64.
 *
 * @throws {Error} if value is not a valid hex string, or if it does not contain 8 bytes
 */
export function hexLeToU64(hexValue: string): u64 {
    let bytes;
    try {
        bytes = hexToBytes(hexValue);
    } catch (error) {
        throw new Error('hexLeToU64 failed', {cause: ensureError(error)});
    }
    if (bytes.byteLength !== 8) {
        throw new Error(
            `hexLeToU64 failed: Value does not contain 8 bytes, but ${bytes.byteLength}`,
        );
    }
    return byteView(DataView, bytes).getBigUint64(0, true);
}
