import {afterEach, describe, expect, it, vi} from 'vitest';

import {setAssertFailLogger} from '../logging/assert-fail-logger.js';

import {unreachable} from './unreachable.js';

describe('unreachable', () => {
    afterEach(() => {
        // Note: The fail logger is module-level state, so clear it after every test.
        setAssertFailLogger(undefined);
    });

    it('throws if reached', () => {
        // Arrange
        function fn(): void {
            unreachable('value' as never);
        }

        // Assert
        expect(fn).toThrow('Unreachable code section!');
    });

    it('throws with the provided custom message', () => {
        // Arrange
        function fn(): void {
            unreachable('value' as never, 'Error message');
        }

        // Assert
        expect(fn).toThrow('Error message');
    });

    it('throws the provided error as-is', () => {
        // Arrange
        const provided = new Error('Error message');

        // Act
        let thrown: unknown;
        try {
            unreachable('value' as never, provided);
        } catch (error: unknown) {
            thrown = error;
        }

        // Assert
        expect(thrown).toBe(provided);
    });

    it('reports the thrown error to the fail logger', () => {
        // Arrange
        const logger = vi.fn();
        setAssertFailLogger(logger);

        // Act
        expect(() => unreachable('value' as never, 'Error message')).toThrow();

        // Assert
        expect(logger).toHaveBeenCalledOnce();
        expect((logger.mock.calls[0]?.[0] as Error).message).toBe('Error message');
    });
});
