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

/**
 * Unreachable code section. This variant is safe because it is checked by the type system.
 *
 * Use this in unreachable places, e.g. the default branch of a switch that should be exhaustive.
 * Will raise a compile error if considered reachable.
 *
 * @throws {Error} Always.
 */
export function unreachable(value: never, message?: string): never {
    throw new Error(message ?? 'Unreachable code section!');
}

/**
 * Expect that a value exists. Return it if it exists and throw if it doesn't.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function unwrap<T>(value: T | null | undefined, message?: string): T {
    assert(value !== undefined && value !== null, message);
    return value;
}
