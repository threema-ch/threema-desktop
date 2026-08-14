import {ensureError} from './ensure-error.js';

/**
 * Assert a specific `Error` type instance. In case it doesn't match, throws with the original error
 * as cause.
 *
 * @param error The error value.
 * @param type The expected `Error` type.
 * @param message Optional message to use when throwing.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assertError<TError extends abstract new (...args: any) => any>(
    error: unknown,
    type: TError,
    message?: string,
): asserts error is InstanceType<TError> {
    if (!(error instanceof type)) {
        throw new Error(message ?? `Assertion of specific error type failed`, {
            cause: ensureError(error),
        });
    }
}
