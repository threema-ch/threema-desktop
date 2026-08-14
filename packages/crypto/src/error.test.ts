import {describe, expect, it} from 'vitest';

import {CryptoError} from './error.js';

describe('CryptoError', () => {
    it('is an Error named "CryptoError"', () => {
        // Arrange
        const error = new CryptoError('Lorem ipsum');

        // Assert
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('CryptoError');
        expect(error.message).toBe('Lorem ipsum');
    });
});
