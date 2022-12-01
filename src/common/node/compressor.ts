import {promisify} from 'node:util';
import {gunzip, gzip} from 'node:zlib';

import {type CompressionMethod, type Compressor, CompressionError} from '~/common/compressor';
import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

/**
 * A Node specific compressor implementation backed by zlib.
 */
export class ZlibCompressor implements Compressor {
    public async compress(
        method: CompressionMethod,
        bytes: ReadonlyUint8Array,
    ): Promise<ReadonlyUint8Array> {
        try {
            switch (method) {
                case 'gzip':
                    return await promisify(gzip)(bytes);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Zlib ${method} compression failed`, {from: error});
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
                    return await promisify(gunzip)(bytes);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Zlib ${method} decompression failed`, {from: error});
        }
    }
}
