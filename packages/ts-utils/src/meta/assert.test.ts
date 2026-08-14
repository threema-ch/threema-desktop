import {afterEach, describe, expect, it, vi} from 'vitest';

import {setAssertFailLogger} from '../logging/assert-fail-logger.js';

import {assert} from './assert.js';

describe('assert', () => {
    afterEach(() => {
        // Note: The fail logger is module-level state, so clear it after every test.
        setAssertFailLogger(undefined);
    });

    it('does not throw when condition is true', () => {
        // Arrange
        function fn(): void {
            assert(true);
        }

        // Assert
        expect(fn).not.toThrow();
    });

    it('throws when condition is false', () => {
        // Arrange
        function fn(): void {
            assert(false);
        }

        // Assert
        expect(fn).toThrow();
    });

    it('includes the provided message in the thrown error', () => {
        // Arrange
        function fn(): void {
            assert(false, 'Error message');
        }

        // Assert
        expect(fn).toThrow('Error message');
    });

    it('reports the thrown error to the fail logger', () => {
        // Arrange
        const logger = vi.fn();
        setAssertFailLogger(logger);

        // Act
        expect(() => assert(false, 'Error message')).toThrow('Error message');

        // Assert
        expect(logger).toHaveBeenCalledOnce();
        expect(logger.mock.calls[0]?.[0]).toBeInstanceOf(Error);
        expect((logger.mock.calls[0]?.[0] as Error).message).toBe(
            'Assertion failed, message: Error message',
        );
    });

    it('does not report to the fail logger when the condition holds', () => {
        // Arrange
        const logger = vi.fn();
        setAssertFailLogger(logger);

        // Act
        assert(true);

        // Assert
        expect(logger).not.toHaveBeenCalled();
    });
});
