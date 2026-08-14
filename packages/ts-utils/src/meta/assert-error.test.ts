import {describe, expect, it} from 'vitest';

import {assertError} from './assert-error.js';

class CustomError extends Error {}

describe('assertError', () => {
    it('does not throw when the error is of the expected type', () => {
        // Arrange
        const error: unknown = new CustomError('Boom');

        // Act & assert
        expect(() => assertError(error, CustomError)).not.toThrow();
    });

    it('does not throw when the error is of a subtype of the expected type', () => {
        // Arrange
        const error: unknown = new CustomError('Boom');

        // Act & assert
        expect(() => assertError(error, Error)).not.toThrow();
    });

    it('throws with a default message when the type does not match', () => {
        // Act & assert
        expect(() => assertError(new Error('Boom'), CustomError)).toThrow(
            'Assertion of specific error type failed',
        );
    });

    it('throws with the provided message when the type does not match', () => {
        // Act & assert
        expect(() => assertError(new Error('Boom'), CustomError, 'Error message')).toThrow(
            'Error message',
        );
    });

    it('attaches the original error as cause', () => {
        // Arrange
        const original = new Error('Boom');

        // Act
        let thrown: unknown;
        try {
            assertError(original, CustomError);
        } catch (error: unknown) {
            thrown = error;
        }

        // Assert
        expect(thrown).toBeInstanceOf(Error);
        expect((thrown as Error).cause).toBe(original);
    });

    it('wraps a non-error value into the cause', () => {
        // Act
        let thrown: unknown;
        try {
            assertError('not an error', CustomError);
        } catch (error: unknown) {
            thrown = error;
        }

        // Assert
        const cause = (thrown as Error).cause;
        expect(cause).toBeInstanceOf(Error);
        expect((cause as Error).message).toBe('not an error');
    });
});
