import {unwrap} from '../meta/unwrap.js';

// `atob` exists in both DOM and Node.
declare function atob(data: string): string;

interface Base64ToU8Options {
    // Amount of 0-padded bytes to be left upfront.
    readonly headroom?: number;
    // Normalize the URL-safe alphabet back to the standard alphabet and re-pad.
    readonly urlSafe?: boolean;
}

/**
 * Decode a base64 string into a {@link Uint8Array}.
 *
 * @param base64String Input base64 string to be decoded.
 * @param options Optional options for the transformation.
 * @returns Output byte array.
 * @throws {Error} if the input is not a valid base64 string.
 */
export function base64ToU8a(base64String: string, options: Base64ToU8Options = {}): Uint8Array {
    let decoded: string;
    try {
        if (options.urlSafe === true) {
            base64String = base64String.replaceAll('-', '+').replaceAll('_', '/');
            const remainder = base64String.length % 4;
            if (remainder !== 0) {
                base64String += '='.repeat(4 - remainder);
            }
        }

        decoded = atob(base64String);
    } catch (error) {
        throw new Error(`Failed to decode base64 string: ${error}`);
    }
    const headroom = options.headroom ?? 0;
    const array = new Uint8Array(headroom + decoded.length);
    const view = array.subarray(headroom);
    for (let index = 0; index < decoded.length; ++index) {
        view[index] = unwrap(decoded[index]).charCodeAt(0);
    }
    return array;
}
