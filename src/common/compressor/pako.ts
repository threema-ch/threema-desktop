import {gzip, ungzip} from 'pako';

import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

import {CompressionError, type CompressionMethod, type Compressor} from '.';

/**
 * A pure-js compressor implementation backed by [pako].
 *
 * [pako]: https://www.npmjs.com/package/pako
 */
export class PakoCompressor implements Compressor {
    // eslint-disable-next-line @typescript-eslint/require-await
    public async compress(
        method: CompressionMethod,
        bytes: ReadonlyUint8Array,
    ): Promise<ReadonlyUint8Array> {
        try {
            switch (method) {
                case 'gzip':
                    return gzip(bytes as Uint8Array);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Pako ${method} compression failed`, {from: error});
        }
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async decompress(
        method: CompressionMethod,
        bytes: ReadonlyUint8Array,
    ): Promise<ReadonlyUint8Array> {
        try {
            switch (method) {
                case 'gzip':
                    return ungzip(bytes as Uint8Array);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Pako ${method} decompression failed`, {from: error});
        }
    }
}
