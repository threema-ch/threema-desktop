/**
 * NodeJS-specific utils.
 */

/**
 * Type guard for NodeJS errors.
 *
 * After applying this type guard, you can access attributes like `.code`.
 *
 * Note: We cannot use `instanceof NodeJS.ErrnoException` because
 *       `ErrnoException` is an interface that doesn't exist at runtime.
 *       However, the `ErrnoException` interface extends `Error` and only
 *       contains optional fields, so any `Error` is also an `ErrnoException`.
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error;
}
