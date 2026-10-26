import {hexWithSeparatorToBytes} from './hex-with-separator-to-bytes.js';

/**
 * Parse a hex string and return a Uint8Array.
 *
 * Note: This function validates the input and won't accept input strings with odd number of
 *       characters or with non-hex characters. For very fast hex decoding of long strings that are
 *       known to contain valid hexadecimal data, a function with less validation may be preferred.
 *
 * @param hexString Hex string (either upper- or lowercase)
 * @returns Uint8Array containing the bytes
 * @throws {Error} if decoding fails or if the input string contains non-hex characters
 */
export function hexToBytes(hexString: string): Uint8Array {
    return hexWithSeparatorToBytes(hexString, 0);
}
