import type {ReadonlyUint8Array} from '../array/readonly-uint8-array.js';
import type {u53} from '../integer/u53.js';

/**
 * Split bytes into an array of byte views of a specific maximum chunk length.
 *
 * Important: `maxChunkLength` must be greater than `0`, otherwise this never terminates.
 */
export function* byteSplit<T extends ReadonlyUint8Array>(
    array: T,
    maxChunkLength: u53,
): IterableIterator<ReadonlyUint8Array> {
    for (let offset = 0; offset < array.byteLength; offset += maxChunkLength) {
        yield array.subarray(offset, offset + maxChunkLength);
    }
}
