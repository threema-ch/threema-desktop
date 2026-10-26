/**
 * Writer for a codec.
 *
 * Note: This must be compatible to {@link WritableStreamDefaultWriter}
 * Spec: https://streams.spec.whatwg.org/#default-writer-class
 */
export interface CodecWriter<O> {
    readonly closed: Promise<void>;
    readonly ready: Promise<void>;
    readonly abort: (reason: Error) => Promise<void>;
    readonly close: () => Promise<void>;
    readonly write: (chunk: O) => Promise<void>;
}
