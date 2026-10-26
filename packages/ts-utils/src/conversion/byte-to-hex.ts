import {ensureU8, type u8} from '../integer/u8.js';
import {unwrap} from '../meta/unwrap.js';

import {HEX_LOOKUP_TABLE} from './hex-lookup-table.js';

/**
 * Convert a single byte to a zero-padded lowercase hex string.
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
