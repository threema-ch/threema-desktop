import {ensureError, exhausted} from '~/common/utils/assert';

const UNSET = Symbol('unset');

/**
 * This function unwraps the synchronous promise in a synchronous way,
 * returning the result.
 *
 * It is used as an adapter for better-sqlite3 (which is synchronous) in
 * combination with ts-sql-query (which is asynchronous by default).
 *
 * @returns The promise result, if it resolves without an error.
 * @throws The promise error, if it resolves with an error.
 * @throws {Error} If the promise is not a synchronous promises.
 */
export function sync<T>(promise: Promise<T>): T {
    let result: T | typeof UNSET = UNSET;
    let error: Error | typeof UNSET = UNSET;

    promise.then((r) => (result = r)).catch((error_) => (error = ensureError(error_)));

    // Propagate error, if available
    if (error !== UNSET) {
        throw exhausted(error, error as Error);
    }

    // Propagate result, if available
    if (result !== UNSET) {
        return exhausted(result, result as T);
    }

    // Note: This wrapper is to be used in combination with the `SynchronousPromise` type,
    // which is not strictly Promise-spec-compliant because it does not defer when calling
    // `.then`. See https://www.npmjs.com/package/synchronous-promise for more details.
    // To ensure that we're indeed using a synchronous promise, ensure that the promise resolved
    // immediately.
    throw new Error(
        'You performed a real async operation, not a database operation, ' +
            'inside the function dedicated to calling the database',
    );
}
