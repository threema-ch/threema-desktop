import {describe, expect, it} from 'vitest';

import {validateUrl, type ValidateUrlProperties} from './validate-url.js';

const PERMISSIVE: ValidateUrlProperties = {
    protocol: 'https:',
    search: 'allow',
    hash: 'allow',
};

const STRICT: ValidateUrlProperties = {
    protocol: 'https:',
    search: 'deny',
    hash: 'deny',
};

describe('validateUrl', () => {
    it('parses a string source', () => {
        // Assert
        expect(validateUrl('https://example.com/path', STRICT).href).toBe(
            'https://example.com/path',
        );
    });

    it('returns the given URL as-is', () => {
        // Arrange
        const url = new URL('https://example.com/path');

        // Assert
        expect(validateUrl(url, STRICT)).toBe(url);
    });

    it('accepts a matching protocol', () => {
        // Assert
        expect(validateUrl('wss://example.com/', {...STRICT, protocol: 'wss:'}).href).toBe(
            'wss://example.com/',
        );
    });

    it('rejects an unexpected protocol', () => {
        // Assert
        expect(() => validateUrl('wss://example.com/', STRICT)).toThrow(
            "URL uses unexpected protocol: 'wss://example.com/' (expected-protocol=https:)",
        );
    });

    it('rejects search parameters when denied', () => {
        // Assert
        expect(() => validateUrl('https://example.com/?a=1', STRICT)).toThrow(
            "URL may not contain search parameters: 'https://example.com/?a=1'",
        );
    });

    it('accepts search parameters when allowed', () => {
        // Assert
        expect(validateUrl('https://example.com/?a=1', PERMISSIVE).search).toBe('?a=1');
    });

    it('rejects a fragment when denied', () => {
        // Assert
        expect(() => validateUrl('https://example.com/#nope', STRICT)).toThrow(
            "URL may not contain fragment/hash: 'https://example.com/#nope'",
        );
    });

    it('accepts a fragment when allowed', () => {
        // Assert
        expect(validateUrl('https://example.com/#yep', PERMISSIVE).hash).toBe('#yep');
    });
});
