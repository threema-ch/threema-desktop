/**
 * Controller for a source codec.
 *
 * Note: This must be compatible to {@link ReadableStreamDefaultController}.
 * Spec: https://streams.spec.whatwg.org/#rs-default-controller-class
 */
export interface SourceCodecController<I> {
    readonly close: () => void;
    readonly enqueue: (chunk: I) => void;
    readonly error: (reason: Error) => void;
}
