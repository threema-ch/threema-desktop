let assertFailLogger: ((error: Error) => void) | undefined;

/**
 * Set a global trace error logger that is called when an assertion fails.
 */
export function setAssertFailLogger(logger: (error: Error) => void): void {
    assertFailLogger = logger;
}

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
        const error = new Error(`Assertion failed, message: ${message}`);
        assertFailLogger?.(error);
        throw error;
    }
}

/**
 * Like {@link assert}, but only run if we're in debug mode.
 */
export function debugAssert(condition: boolean, message?: string): asserts condition {
    if (import.meta.env.DEBUG) {
        assert(condition, message);
    }
}

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

/**
 * Mark a section as asserted to be unreachable. This is not checked by the type system, so should
 * be avoided for matching.
 *
 * Use this in unreachable places without explicit matching, e.g. when chaining with the `??`
 * operator (`contacts.get('foo') ?? assert` in case the caller definitely knows that the contact
 * 'foo' exists).
 *
 * @throws {Error} Always.
 */
export function assertUnreachable(message: unknown): never {
    const options = message instanceof Error ? {cause: message} : {};
    const error = new Error(`Asserted unreachable code section: ${message}`, options);
    assertFailLogger?.(error);
    throw error;
}

/**
 * Unreachable code section. This variant is safe because it is checked by the type system.
 *
 * Use this in unreachable places, e.g. the default branch of a switch that should be exhaustive.
 * Will raise a compile error if considered reachable.
 *
 * @throws {Error} Always.
 */
export function unreachable(value: never, error?: Error): never {
    error ??= new Error('Unreachable code section!');
    assertFailLogger?.(error);
    throw error;
}

/**
 * Ensure that something is ruled out (`never`) in the type system. Is a no-op at runtime.
 *
 * Use this in reachable places where exhaustive matching should happen, e.g. a default arm of a
 * switch/case with an unknown input value casted to a more specific value. Concretely:
 *
 *     const maybeSomeEnum = value as SomeEnum;
 *     switch (maybeSomeEnum) {
 *         [...]
 *         default:
 *             return exhausted(maybeSomeEnum, SomeEnum.FALLBACK)
 *     }
 */
export function exhausted(value: never): void;
export function exhausted<T>(value: never, fallback: T): T;
export function exhausted<T>(value: never, fallback?: T): T {
    // Note: Ugly cast but it fits the above two signatures, so it's alright.
    return fallback as unknown as T;
}

/**
 * Expect that a value exists. Return it if it exists and throw if it doesn't.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function unwrap<T>(value: T | null | undefined, message?: string): T {
    assert(value !== undefined && value !== null, message);
    return value;
}

/**
 * Ensure a caught error is an actual `Error` instance.
 */
export function ensureError(error: unknown): Error {
    if (error instanceof Error) {
        return error;
    }
    return new Error(`${error}`);
}

/**
 * Typeguard to ensure that a value is not undefined.
 */
export function isNotUndefined<T>(val: T | undefined): val is T {
    return val !== undefined;
}
