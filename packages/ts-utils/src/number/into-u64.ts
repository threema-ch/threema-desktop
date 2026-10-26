import type Long from 'long';

import type {u64} from '../integer/u64.js';

/**
 * Convert an unsigned Long instance to a u64.
 *
 * @throws {Error} if value is not unsigned
 */
export function unsignedLongToU64(value: Long): u64 {
    if (!value.unsigned) {
        throw new Error(`Long value is not unsigned`);
    }
    return (
        BigInt(value.getLowBitsUnsigned()) +
        // eslint-disable-next-line no-bitwise
        (BigInt(value.getHighBitsUnsigned()) << 32n)
    );
}
