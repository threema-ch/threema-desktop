import {TransferTag} from '~/common/enum';
import {BaseError} from '~/common/error';
import {registerErrorTransferHandler, TRANSFER_HANDLER} from '~/common/utils/endpoint';

/**
 * A handle to the `enqueue` function of a compatible codec.
 */
export interface CodecEnqueuer<O> {
    readonly enqueue: (chunk: O) => void;
}

/**
 * Controller for a transformation codec.
 *
 * Note: This must be compatible to {@link TransformStreamDefaultController}.
 * Spec: https://streams.spec.whatwg.org/#ts-default-controller-class
 */
export interface TransformerCodecController<O> {
    readonly enqueue: (chunk: O) => void;
}

/**
 * Controller for a sink codec.
 *
 * Note: This must be compatible to {@link WritableStreamDefaultController}.
 * Spec: https://streams.spec.whatwg.org/#ts-default-controller-class
 */
export interface SinkCodecController {
    readonly error: (reason: Error) => void;
}

/**
 * Controller for a source codec.
 *
 * Note: This must be compatible to {@link ReadableStreamDefaultController}.
 * Spec: https://streams.spec.whatwg.org/#ts-default-controller-class
 */
export interface SourceCodecController<I> {
    readonly close: () => void;
    readonly enqueue: (chunk: I) => void;
    readonly error: (reason: Error) => void;
}

/**
 * A transformation codec.
 *
 * Note: This must be compatible to {@link Transformer}.
 * Spec: https://streams.spec.whatwg.org/#transformer-api
 */
export interface AsyncTransformerCodec<I, O> {
    readonly start?: (controller: TransformerCodecController<O>) => void | Promise<void>;
    readonly transform: (
        chunk: I,
        controller: TransformerCodecController<O>,
    ) => void | Promise<void>;
}

/**
 * A synchronous transformation codec. Chained transformation codecs guarantee that a single
 * transformation chain completes before the next is initiated.
 *
 * Note: This cannot be chained with normal {@link Transformer}s without an adapter that bundles the
 * synchronous transformation codec chain into a single asynchronous transformation codec.
 */
export interface SyncTransformerCodec<I, O> {
    readonly start?: (forward: (chunk: O) => void) => void;
    readonly transform: (chunk: I, forward: (chunk: O) => void) => void;
}

/**
 * An asynchronous sink codec.
 *
 * Note: This must be compatible to {@link UnderlyingSink}.
 * Spec: https://streams.spec.whatwg.org/#underlying-sink-api
 */
export interface AsyncCodecSink<O> {
    readonly start?: (controller: SinkCodecController) => void | Promise<void>;
    readonly write: (chunk: O, controller: SinkCodecController) => Promise<void>;
    readonly close: () => void;
    readonly abort: (reason: Error) => void;
}

/**
 * An asynchronous source codec.
 *
 * Note: This must be compatible to {@link UnderlyingSource}.
 * Spec: https://streams.spec.whatwg.org/#underlying-source-api
 */
export interface AsyncCodecSource<I> {
    start?: (controller: SourceCodecController<I>) => void | Promise<void>;
    pull: (controller: SourceCodecController<I>) => PromiseLike<void>;
    cancel: (reason: Error) => void;
}

/**
 * Read result for a read operation on a codec reader.
 */
export type CodecReadResult<I> = Readonly<
    | {
          done: false;
          value: I;
      }
    | {
          done: true;
          value: undefined;
      }
>;

/**
 * Reader for a codec.
 *
 * Note: This must be compatible to {@link ReadableStreamDefaultReader}
 * Spec: https://streams.spec.whatwg.org/#default-reader-class
 */
export interface CodecReader<I> {
    readonly closed: Promise<void>;
    readonly read: () => Promise<CodecReadResult<I>>;
    readonly cancel: (reason: Error) => Promise<void>;
}

/**
 * Writer for a codec.
 *
 * Note: This must be compatible to {@link ReadableStreamDefaultWriter}
 * Spec: https://streams.spec.whatwg.org/#default-writer-class
 */
export interface CodecWriter<O> {
    readonly closed: Promise<void>;
    readonly ready: Promise<void>;
    readonly abort: (reason: Error) => Promise<void>;
    readonly close: () => Promise<void>;
    readonly write: (chunk: O) => Promise<void>;
}

/**
 * Result of a UTF-8 encode _full_ or _partial_ procedure.
 */
interface Utf8EncodeResult {
    /**
     * An alias to the array the string was encoded into.
     *
     * For example, when calling `.encodeFullyInto('hi', new Uint8Array(5))`, this field will be an
     * alias to the array of 5 bytes.
     */
    readonly array: Uint8Array;

    /**
     * A subarray of the given array representing the portion of bytes that were encoded.
     *
     * For example, when calling `.encodeFullyInto('hi', new Uint8Array(5))`, this field will
     * reference a subarray of 2 bytes `'hi'` has been encoded into.
     */
    readonly encoded: Uint8Array;

    /**
     * The remaining bytes that are left unused.
     *
     * For example, when calling `.encodeFullyInto('hi', new Uint8Array(5))`, this field will
     * reference a subarray of the trailing 3 bytes.
     */
    readonly rest: Uint8Array;
}

/**
 * A UTF-8 text encoder/decoder.
 */
export interface Utf8Codec {
    /**
     * Decode UTF-8 bytes to a string.
     */
    readonly decode: (array: Uint8Array) => string;

    /**
     * Encode a string to UTF-8 bytes.
     */
    readonly encode: (source: string) => Uint8Array;

    /**
     * Encode a string into UTF-8 bytes using the provided array.
     *
     * @throws {EncodingError} in case the provided array provides insufficient space.
     */
    readonly encodeFullyInto: (source: string, array: Uint8Array) => Utf8EncodeResult;

    /**
     * Encode a string into UTF-8 bytes using the provided array.
     *
     * Note: This does not throw in case the provided array provides insufficient space!
     */
    readonly encodePartiallyInto: (source: string, array: Uint8Array) => Utf8EncodeResult;
}

// The globals `TextEncoder` and `TextDecoder` exist in both DOM and Node, so
// we'll just assume they're always available.
//
/* eslint-disable no-restricted-syntax,@typescript-eslint/method-signature-style,@typescript-eslint/naming-convention */
// Decoder
interface TextDecoderCommon {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;
}
interface TextDecodeOptions {
    stream?: boolean;
}
interface TextDecoder extends TextDecoderCommon {
    decode(input?: ArrayBufferView | ArrayBuffer, options?: TextDecodeOptions): string;
}
interface TextDecoderOptions {
    fatal?: boolean;
    ignoreBOM?: boolean;
}
declare const TextDecoder: {
    prototype: TextDecoder;
    new (label?: string, options?: TextDecoderOptions): TextDecoder;
};
// Encoder
interface TextEncoderCommon {
    readonly encoding: string;
}
interface TextEncoderEncodeIntoResult {
    read?: number;
    written?: number;
}
interface TextEncoder extends TextEncoderCommon {
    encode(input?: string): Uint8Array;
    encodeInto(source: string, destination: Uint8Array): TextEncoderEncodeIntoResult;
}
declare const TextEncoder: {
    prototype: TextEncoder;
    new (): TextEncoder;
};
/* eslint-enable no-restricted-syntax,@typescript-eslint/method-signature-style,@typescript-eslint/naming-convention */

const ENCODING_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    EncodingError,
    TransferTag.ENCODING_ERROR
>({
    tag: TransferTag.ENCODING_ERROR,
    serialize: () => [],
    deserialize: (message, cause) => new EncodingError(message, {from: cause}),
});

/**
 * UTF-8 codec error.
 */
export class EncodingError extends BaseError {
    public [TRANSFER_HANDLER] = ENCODING_ERROR_TRANSFER_HANDLER;
}

/**
 * Simple wrapper around {@link TextEncoder} and {@link TextDecoder} for UTF-8
 * encoding/decoding purposes.
 */
class Utf8TextEncoderDecoderCodec implements Utf8Codec {
    private readonly _decoder: TextDecoder;
    private readonly _encoder: TextEncoder;

    public constructor() {
        // Create instances. Use the 'fatal' flag to ensure the decoder throws
        // an error in case a coding error is found.
        this._decoder = new TextDecoder('utf-8', {fatal: true});
        this._encoder = new TextEncoder();
    }

    /** @inheritdoc */
    public decode(array: Uint8Array): string {
        return this._decoder.decode(array);
    }

    /** @inheritdoc */
    public encode(source: string): Uint8Array {
        return this._encoder.encode(source);
    }

    /** @inheritdoc */
    public encodeFullyInto(source: string, array: Uint8Array): Utf8EncodeResult {
        const result = this._encoder.encodeInto(source, array);
        if (result.read !== source.length) {
            throw new EncodingError(
                `Unable to encode string into buffer, ` +
                    `insufficient space: ${source.length} != ${result.read}`,
            );
        }
        if (result.written === undefined) {
            throw new EncodingError('Unable to encode string info buffer, "written" is undefined');
        }
        return {
            array,
            encoded: array.subarray(0, result.written),
            rest: array.subarray(result.written),
        };
    }

    /** @inheritdoc */
    public encodePartiallyInto(source: string, array: Uint8Array): Utf8EncodeResult {
        const result = this._encoder.encodeInto(source, array);
        return {
            array,
            encoded: array.subarray(0, result.written ?? 0),
            rest: array.subarray(result.written ?? 0),
        };
    }
}

/**
 * A UTF-8 text encoder/decoder.
 */
export const UTF8 = new Utf8TextEncoderDecoderCodec();
