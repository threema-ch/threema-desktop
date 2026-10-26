import {describe, expect, it} from 'vitest';

import {hexLeToU64} from './hex-le-to-u64.js';

describe('hexLeToU64', () => {
    it('is little endian', () => {
        expect(hexLeToU64('1001f0efdecdbcab')).toBe(0xabbccddeeff00110n);
    });

    it('accepts lowercase and uppercase hex characters', () => {
        expect(hexLeToU64('1001f0efdecdbcab')).toBe(0xabbccddeeff00110n);
        expect(hexLeToU64('1001F0EFDECDBCAB')).toBe(0xabbccddeeff00110n);
    });

    it('rejects invalid hex values', () => {
        expect(() => hexLeToU64('1001f0efdecdefgh')).toThrow('hexLeToU64 failed');
    });

    it('requires exactly 8 bytes', () => {
        expect(() => hexLeToU64('1001f0efdecdbc')).toThrow(
            'hexLeToU64 failed: Value does not contain 8 bytes, but 7',
        );
        expect(() => hexLeToU64('1001f0efdecdbcabff')).toThrow(
            'hexLeToU64 failed: Value does not contain 8 bytes, but 9',
        );
    });
});
