// Call protocol code that requires WebWorker APIs (e.g. WebCrypto or encoded media frames).
//
// This entry point is the platform boundary of `@threema/call`: everything reachable from the
// package's top-level entry point is type checked without the `DOM` and `WebWorker` libraries, while
// the sources below this directory are checked with the `WebWorker` library.
//
// Note: Apart from the assertion below, this entry point is intentionally empty for now. It exists
// so that the platform boundary is established before its first occupant (the media key material of
// the media-frame cryptography) moves in.

/**
 * Compile-time assertion that this entry point is type checked with the `WebWorker` library, i.e.
 * that the platform boundary described above is in effect.
 */
export type WorkerGlobalScopeMustResolve = typeof WorkerGlobalScope;
