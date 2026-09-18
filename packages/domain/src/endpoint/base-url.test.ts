import {describe, expect, it} from 'vitest';

import {ensureBaseUrl} from './base-url.js';

describe('ensureBaseUrl', () => {
    it('keeps a path that already ends with a forward slash', () => {
        // Assert
        expect(ensureBaseUrl('https://example.com/sfu/', 'https:').href).toBe(
            'https://example.com/sfu/',
        );
    });

    it('appends the missing forward slash', () => {
        // Assert
        expect(ensureBaseUrl('https://example.com/sfu', 'https:').href).toBe(
            'https://example.com/sfu/',
        );
    });

    it('keeps username, password and port', () => {
        // Assert
        expect(ensureBaseUrl('https://user:pass@example.com:4711/sfu', 'https:').href).toBe(
            'https://user:pass@example.com:4711/sfu/',
        );
    });

    it('does not modify the provided URL', () => {
        // Arrange
        const source = new URL('https://example.com/sfu');

        // Act
        const base = ensureBaseUrl(source, 'https:');

        // Assert
        expect(source.href).toBe('https://example.com/sfu');
        expect(base.href).toBe('https://example.com/sfu/');
    });

    it('rejects an unexpected protocol', () => {
        // Assert
        expect(() => ensureBaseUrl('https://example.com/', 'wss:')).toThrow(
            'URL uses unexpected protocol',
        );
    });

    it('rejects search parameters', () => {
        // Assert
        expect(() => ensureBaseUrl('https://example.com/?a=1', 'https:')).toThrow(
            'URL may not contain search parameters',
        );
    });

    it('rejects a fragment', () => {
        // Assert
        expect(() => ensureBaseUrl('https://example.com/#nope', 'https:')).toThrow(
            'URL may not contain fragment/hash',
        );
    });
});
