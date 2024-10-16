import type {ReadonlyUint8Array, u53} from '~/common/types';
import {unwrap} from '~/common/utils/assert';

// These exist both in DOM and Node
declare function atob(data: string): string;
declare function btoa(data: string): string;

interface Base64Options {
    readonly urlSafe?: boolean;
}

interface Base64ToU8Options {
    // Amount of 0-padded bytes to be left upfront.
    readonly headroom?: u53;
}

/**
 * Encode a Uint8Array to a base 64 string.
 *
 * @param array Input byte array.
 * @param urlSafe If set to true, output will be URL safe according to RFC 4648 (with `+` and `/`
 *   replaced by `-` and `_`).
 * @returns A base64 string.
 */
export function u8aToBase64(array: ReadonlyUint8Array, options?: Base64Options): string {
    const base64 = btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join(''));
    if (options?.urlSafe === true) {
        return base64.replaceAll('+', '-').replaceAll('/', '_');
    }
    return base64;
}

/**
 * Decode a base 64 string into a Uint8Array.
 *
 * @param base64String Input base64 string to be decoded.
 * @param options Optional options for the transformation.
 * @returns Output byte array.
 */
export function base64ToU8a(base64String: string, options: Base64ToU8Options = {}): Uint8Array {
    let decoded;
    try {
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
