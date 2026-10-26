import {describe, expect, it} from 'vitest';

import {u64ToHexLe} from './u64-to-hex-le.js';

describe('u64ToHexLe', () => {
    it('is little endian', () => {
        expect(u64ToHexLe(0xabbccddeeff00110n)).toBe('1001f0efdecdbcab');
    });

    it('only uses lowercase hex characters', () => {
        expect(u64ToHexLe(0xabbccddeeff00110n)).toMatch(/^[0-9a-f]{16}$/u);
    });

    it('zero pads to 16 characters', () => {
        expect(u64ToHexLe(1337n)).toBe('3905000000000000');
    });

    it('encodes the u64 maximum value', () => {
        expect(u64ToHexLe(0xffffffffffffffffn)).toBe('ffffffffffffffff');
    });

    it('encodes the u64 minimum value', () => {
        expect(u64ToHexLe(0n)).toBe('0000000000000000');
    });
});
