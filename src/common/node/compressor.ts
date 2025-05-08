import {promisify} from 'node:util';
import {gunzip, gzip} from 'node:zlib';

import {CompressionError, type CompressionMethod, type Compressor} from '~/common/compressor';
import type {ReadonlyUint8Array} from '~/common/types';
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
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                case 'gzip':
                    return await promisify(gzip)(bytes as Uint8Array);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Zlib ${method} compression failed`, {from: error});
        }
    }

    public async decompress(
        method: CompressionMethod,
        bytes: ReadonlyUint8Array,
    ): Promise<ReadonlyUint8Array> {
        try {
            switch (method) {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                case 'gzip':
                    return await promisify(gunzip)(bytes as Uint8Array);
                default:
                    return unreachable(method);
            }
        } catch (error) {
            throw new CompressionError(`Zlib ${method} decompression failed`, {from: error});
        }
    }
}
