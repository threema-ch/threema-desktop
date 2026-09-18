import {describe, expect, it} from 'vitest';

import {ensureIdentityString, isIdentityString} from './identity-string.js';

describe('isIdentityString', () => {
    it.each(['ECHOECHO', '*THREEMA', '12345678', 'A1B2C3D4'])('accepts %o', (value) => {
        // Assert
        expect(isIdentityString(value)).toBe(true);
    });

    it.each([
        'ECHOECH', // Too short
        'ECHOECHO1', // Too long
        'echoecho', // Lowercase
        'ECHO*CHO', // Asterisk beyond the first character
        '', // Empty
        42, // Not a string
        undefined,
    ])('rejects %o', (value) => {
        // Assert
        expect(isIdentityString(value)).toBe(false);
    });
});

describe('ensureIdentityString', () => {
    it('returns a valid Threema ID', () => {
        // Assert
        expect(ensureIdentityString('ECHOECHO')).toBe('ECHOECHO');
    });

    it('rejects an invalid Threema ID', () => {
        // Assert
        expect(() => ensureIdentityString('echoecho')).toThrow('Not a valid Threema ID: echoecho');
    });
});
