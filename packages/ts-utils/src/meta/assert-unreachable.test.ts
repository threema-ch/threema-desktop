import {afterEach, describe, expect, it, vi} from 'vitest';

import {setAssertFailLogger} from '../logging/assert-fail-logger.js';

import {assertUnreachable} from './assert-unreachable.js';

describe('assertUnreachable', () => {
    afterEach(() => {
        // Note: The fail logger is module-level state, so clear it after every test.
        setAssertFailLogger(undefined);
    });

    it('throws with the message appended', () => {
        // Act & assert
        expect(() => assertUnreachable('value')).toThrow(
            'Asserted unreachable code section: value',
        );
    });

    it('attaches the message as cause when it is an error', () => {
        // Arrange
        const cause = new Error('Boom');

        // Act
        let thrown: unknown;
        try {
            assertUnreachable(cause);
        } catch (error: unknown) {
            thrown = error;
        }

        // Assert
        expect((thrown as Error).message).toBe('Asserted unreachable code section: Error: Boom');
        expect((thrown as Error).cause).toBe(cause);
    });

    it('does not attach a cause for a non-error message', () => {
        // Act
        let thrown: unknown;
        try {
            assertUnreachable('value');
        } catch (error: unknown) {
            thrown = error;
        }

        // Assert
        expect((thrown as Error).cause).toBeUndefined();
    });

    it('reports the thrown error to the fail logger', () => {
        // Arrange
        const logger = vi.fn();
        setAssertFailLogger(logger);

        // Act
        expect(() => assertUnreachable('value')).toThrow();

        // Assert
        expect(logger).toHaveBeenCalledOnce();
        expect((logger.mock.calls[0]?.[0] as Error).message).toBe(
            'Asserted unreachable code section: value',
        );
    });
});
