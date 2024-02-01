// eslint-disable-next-line @typescript-eslint/no-empty-function
const UNRESOLVED_PROMISE = new Promise(() => {});

/**
 * @returns a promise that never resolves.
 */
// eslint-disable-next-line @typescript-eslint/promise-function-async
export function unresolved<T>(): Promise<T> {
    return UNRESOLVED_PROMISE as Promise<T>;
}
