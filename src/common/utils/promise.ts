/**
 * Return a promise that never resolves.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function eternalPromise(): Promise<never> {
    return Promise.race([]);
}
