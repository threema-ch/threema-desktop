import * as adapter from '@mattiasbuelens/web-streams-adapter';
import {type ReadableStream, type WritableStream} from 'web-streams-polyfill/es2018';

/**
 * A bidirectional stream is simply an interface that has both a readable and
 * a writable stream.
 */
export interface BidirectionalStream<R, W> {
    readonly readable: ReadableStream<R>;
    readonly writable: WritableStream<W>;
}

// Re-export. This allows us to easily switch or conditionally drop parts of
// the polyfill.
export * from 'web-streams-polyfill/es2018';
export {adapter};
