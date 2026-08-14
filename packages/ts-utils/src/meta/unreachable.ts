import {getAssertFailLogger} from '../logging/assert-fail-logger.js';

/**
 * Unreachable code section. This variant is safe because it is checked by the type system.
 *
 * Use this in unreachable places, e.g. the default branch of a switch that should be exhaustive.
 * Will raise a compile error if considered reachable.
 *
 * @throws {Error} Always.
 */
export function unreachable(value: never, messageOrError?: string | Error): never {
    const error =
        messageOrError instanceof Error
            ? messageOrError
            : new Error(messageOrError ?? 'Unreachable code section!');
    getAssertFailLogger()?.(error);
    throw error;
}
