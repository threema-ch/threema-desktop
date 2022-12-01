/**
 * Assert a condition.
 *
 * @param condition The condition that must be `true` or otherwise this function will throw an
 *   error.
 * @param message Additional metadata that will be added to the error in case condition is `false`.
 * @throws {Error} If the condition is false.
 */
 export function assert(condition: boolean, message?: string): asserts condition {
    if (!condition) {
        throw new Error(`Assertion failed, message: ${message}`);
    }
}
