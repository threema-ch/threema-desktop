import {TransferTag} from '~/common/enum';
import {BaseError} from '~/common/error';
import {type ReadonlyUint8Array} from '~/common/types';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';

/**
 * Compression methods supported by the compressor.
 */
export type CompressionMethod = 'gzip';

export interface Compressor {
    /**
     * Compress the specified bytes with the specified compression method.
     *
     * @throws {CompressionError} if compression fails.
     */
    compress: (method: CompressionMethod, bytes: ReadonlyUint8Array) => Promise<ReadonlyUint8Array>;

    /**
     * Decompress the specified bytes with the specified compression method.
     *
     * @throws {CompressionError} if decompression fails.
     */
    decompress: (
        method: CompressionMethod,
        bytes: ReadonlyUint8Array,
    ) => Promise<ReadonlyUint8Array>;
}

const COMPRESSION_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    CompressionError,
    TransferTag.COMPRESSION_ERROR
>({
    tag: TransferTag.COMPRESSION_ERROR,
    serialize: (error) => [],
    deserialize: (message, cause) => new CompressionError(message, {from: cause}),
});

export class CompressionError extends BaseError {
    public [TRANSFER_MARKER] = COMPRESSION_ERROR_TRANSFER_HANDLER;
}
