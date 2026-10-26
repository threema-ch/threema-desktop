import Long from 'long';

import type {u64} from '../integer/u64.js';

/**
 * Convert a u64 to a Long instance.
 *
 * @param value Unsigned 64-bit integer to be converted.
 * @returns the value as a Long instance.
 */
export function u64ToUnsignedLong(value: u64): Long {
    return Long.fromBits(
        Number(BigInt.asUintN(32, value)),
        // eslint-disable-next-line no-bitwise
        Number(BigInt.asUintN(32, value >> 32n)),
        true,
    );
}
