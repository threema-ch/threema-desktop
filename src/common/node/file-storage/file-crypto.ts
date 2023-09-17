import type {FileId} from '~/common/file-storage';
import type {ReadonlyUint8Array, u53} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {byteView, hexToBytes} from '~/common/utils/byte';

/**
 * Randomized counter based 96-bit nonce for AES-GCM.
 *
 * It is calculated as follows:
 *
 *     0      8     16     24     32     40     48     56     64     72     80     88     96
 *     +------+------+------+------+------+------+------+------+------+------+------+------+
 *     | file ID suffix (32 bits)  | chunk counter (32 bits)   | reserved (24 bits) | lcm¹ |
 *     +------+------+------+------+------+------+------+------+------+------+------+------+
 *     ¹ last chunk marker (8 bits)
 *
 * ...where
 *
 * - the "file ID suffix" consists of the last 4 bytes (32 bits) of the random file ID
 * - "chunk counter", represented in 32 bits, starts with 1 for the first chunk, and is incremented
 *   for every subsequent chunk
 * - "reserved" must be all zeroes
 * - "lastChunk", represented in 8 bits, is 1 for the last chunk of a file, and 0 otherwise
 *
 * We randomize the nonce (as opposed to a purely counter-based nonce) by re-using a part of the
 * randomly generated file ID. The randomized part improves multi-user/multi-key security.
 */
export class FileChunkNonce {
    public static readonly MAX_COUNTER = 2 ** 32 - 1;

    private readonly _nonce: Uint8Array;
    private _counter: u53 = 1;
    private _lastChunkReached = false;

    public constructor(fileId: FileId) {
        // Determine file ID suffix (last 4 bytes)
        const fileIdSuffixHex = fileId.slice(40);
        const fileIdSuffix = hexToBytes(fileIdSuffixHex);
        assert(fileIdSuffix.byteLength === 4);

        // Initialize nonce with first 32 bits set to the file ID suffix
        const nonce = new Uint8Array(12);
        nonce.set(fileIdSuffix, 0);
        this._nonce = nonce;
    }

    /**
     * Retrieve a nonce for the next chunk.
     *
     * Only set the `lastChunk` flag to true for the last chunk. Afterwards, {@link next()} may not
     * be called again, otherwise an exception will be thrown.
     *
     * WARNING: For every call to {@link next()}, an internal buffer is re-used. Make sure to use or
     *          copy the returned array before you call {@link next()} again! The returned array may
     *          not be modified.
     */
    public next(lastChunk: boolean): ReadonlyUint8Array {
        if (this._lastChunkReached) {
            throw new Error('Function called again after last chunk was reached');
        }
        if (this._counter > FileChunkNonce.MAX_COUNTER) {
            throw new Error('Max counter reached!');
        }

        // Create data view with an offset of 4 bytes (i.e. excluding the file ID suffix)
        const view = byteView(DataView, this._nonce.subarray(4));

        // Set 32-bit counter
        view.setUint32(0, this._counter++, false);

        // Set lastChunk flag
        if (lastChunk) {
            view.setUint8(7, 1);
            this._lastChunkReached = true;
        }

        return this._nonce;
    }
}
