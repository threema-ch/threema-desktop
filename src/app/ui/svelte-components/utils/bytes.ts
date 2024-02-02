import {unwrap} from './assert';

// prettier-ignore
const HEX_LOOKUP_TABLE = [
    '0', '1', '2', '3', '4', '5', '6', '7',
    '8', '9', 'a', 'b', 'c', 'd', 'e', 'f',
];

/**
 * Convert an unsigned 8 bit integer to its hex string representation.
 *
 * @param byte 8 bit integer to convert
 * @returns hex string representation
 */
export function byteToHex(byte: number): string {
    /* eslint-disable no-bitwise */
    return unwrap(HEX_LOOKUP_TABLE[byte >>> 4]) + unwrap(HEX_LOOKUP_TABLE[byte & 0x0f]);
    /* eslint-enable no-bitwise */
}

/**
 * Convert an unsigned 8 bit integer to a printable ASCII representation.
 * If it is not a printable character, the placeholder · will be returned.
 *
 * @param byte 8 bit integer to convert
 * @returns printable ASCII representation
 */
export function byteToPrintableAscii(byte: number): string {
    if (byte >= 32 && byte <= 126) {
        return String.fromCharCode(byte);
    }
    return '·';
}
