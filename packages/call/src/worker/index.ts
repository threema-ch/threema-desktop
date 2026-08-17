// Call protocol code that requires DOM or WebWorker APIs (e.g. `fetch`, WebCrypto or encoded media
// frames).
//
// This entry point is the platform boundary of `@threema/call`: everything reachable from the
// package's top-level entry point is type checked without the `DOM` and `WebWorker` libraries, while
// the sources below this directory are checked with the `WebWorker` library.

export {
    FetchSfuHttpClient,
    type SfuCallData,
    type SfuHttpClient,
    type SfuHttpClientOptions,
    type SfuHttpLoggerFactory,
} from './sfu-http.js';
