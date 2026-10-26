import type {u53} from '../integer/u53.js';

/**
 * Parse a hex string with a separator between each byte (e.g. a colon) and return a Uint8Array.
 *
 * Note: This function validates the input and won't accept input strings with odd number of
 *       characters or with non-hex characters. For very fast hex decoding of long strings that are
 *       known to contain valid hexadecimal data, a function with less validation may be preferred.
 *
 * @param hexString Hex string (either upper- or lowercase)
 * @param separatorLength Length of the separator in between hex bytes
 * @returns Uint8Array containing the bytes
 * @throws {Error} if decoding fails or if the input string contains non-hex characters
 */
export function hexWithSeparatorToBytes(hexString: string, separatorLength: u53): Uint8Array {
    if (hexString.length === 0) {
        return new Uint8Array(0);
    }
    const step = 2 + separatorLength;
    const byteLength = (hexString.length + separatorLength) / step;
    if (!Number.isInteger(byteLength)) {
        throw new Error('Invalid hex string length');
    }
    const array = new Uint8Array(byteLength);

    // Extract bytes
    for (let i = 0, j = 0; i < hexString.length; i += step, ++j) {
        const hexByte = hexString.substring(i, i + 2);

        // Ensure that hex byte contains valid hexadecimal characters only
        for (let k = 0; k < hexByte.length; k++) {
            const cc = hexByte.charCodeAt(k);
            if (cc < 48 || (cc > 57 && cc < 65) || (cc > 70 && cc < 97) || cc > 102) {
                throw new Error(`Invalid hex character: ${hexByte[k]}`);
            }
        }

        // Convert hex string to byte. Note that we don't need to check for NaN thanks to the input
        // validation above.
        array[j] = parseInt(hexByte, 16);
    }

    return array;
}
