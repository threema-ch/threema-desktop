import {getAssertFailLogger} from '../logging/assert-fail-logger.js';

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
    getAssertFailLogger()?.(error);
    throw error;
}
