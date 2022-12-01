import {type ReadonlyUint8Array} from '~/common/types';

// These exist both in DOM and Node
declare function atob(data: string): string;
declare function btoa(data: string): string;

/**
 * Encode a Uint8Array to a base 64 string.
 *
 * @param array Input byte array.
 * @returns A base64 string.
 */
export function u8aToBase64(array: ReadonlyUint8Array): string {
    return btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join(''));
}

/**
 * Decode a base 64 string into a Uint8Array.
 *
 * @param base64String Input base64 string to be decoded.
 * @param headroom Amount of 0-padded bytes to be left upfront. Defaults to `0`.
 * @returns Output byte array.
 */
export function base64ToU8a(base64String: string, headroom = 0): Uint8Array {
    let decoded;
    try {
        decoded = atob(base64String);
    } catch (error) {
        throw new Error(`Failed to decode base64 string: ${error}`);
    }
    const array = new Uint8Array(headroom + decoded.length);
    const view = array.subarray(headroom);
    for (let i = 0; i < decoded.length; ++i) {
        view[i] = decoded[i].charCodeAt(0);
    }
    return array;
}
