import type {ReadonlyUint8Array} from '../array/readonly-uint8-array.js';

// `btoa` exists in both DOM and Node.
declare function btoa(data: string): string;

interface Base64Options {
    readonly urlSafe?: boolean;
}

/**
 * Encode a byte array to a base64 string.
 *
 * @param array Input byte array.
 * @param options Optional options for the transformation.
 * @returns A base64 string.
 */
export function u8aToBase64(array: ReadonlyUint8Array, options?: Base64Options): string {
    const base64 = btoa(Array.from(array, (byte) => String.fromCharCode(byte)).join(''));
    if (options?.urlSafe === true) {
        return base64.replaceAll('+', '-').replaceAll('/', '_');
    }
    return base64;
}
