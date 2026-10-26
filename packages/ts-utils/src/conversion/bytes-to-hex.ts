import type {ReadonlyUint8Array} from '../array/readonly-uint8-array.js';

import {HEX_LOOKUP_TABLE} from './hex-lookup-table.js';

/**
 * Convert an Uint8Array to a zero-padded lowercase hex string.
 *
 * @param array Array to convert
 * @param separator Optional separator in between hex bytes
 * @returns String containing the bytes as hex
 */
export function bytesToHex(array: ReadonlyUint8Array, separator = ''): string {
    const hexString = array.reduce(
        /* eslint-disable no-bitwise */
        (parts, value) =>
            `${parts}${HEX_LOOKUP_TABLE[value >>> 4]}${HEX_LOOKUP_TABLE[value & 0x0f]}${separator}`,
        '',
        /* eslint-enable no-bitwise */
    );
    return separator.length > 0 ? hexString.slice(0, -separator.length) : hexString;
}
