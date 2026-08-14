/**
 * A logger that is called with the error of a failed assertion.
 */
export type AssertFailLogger = (error: Error) => void;

let assertFailLogger: AssertFailLogger | undefined;

/**
 * Set a global trace error logger that is called when an assertion fails.
 *
 * Note: This is module-level state, so it must be set once per JS realm (e.g. in each worker).
 *
 * @param logger The logger to report assertion failures to, or `undefined` to report nowhere.
 */
export function setAssertFailLogger(logger: AssertFailLogger | undefined): void {
    assertFailLogger = logger;
}

/**
 * Get the logger set via {@link setAssertFailLogger}, if any.
 */
export function getAssertFailLogger(): AssertFailLogger | undefined {
    return assertFailLogger;
}
