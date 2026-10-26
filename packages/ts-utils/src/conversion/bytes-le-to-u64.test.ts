import {describe, expect, it} from 'vitest';

import {bytesLeToU64} from './bytes-le-to-u64.js';

describe('bytesLeToU64', () => {
    it('decodes 8 little-endian bytes to a u64', () => {
        expect(bytesLeToU64(Uint8Array.of(0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01))).toBe(
            0x0102030405060708n,
        );
    });

    it('decodes all-zero bytes to 0n', () => {
        expect(bytesLeToU64(new Uint8Array(8))).toBe(0n);
    });

    it('decodes all-0xff bytes to the u64 max', () => {
        expect(bytesLeToU64(Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff))).toBe(
            2n ** 64n - 1n,
        );
    });

    it('throws when given fewer than 8 bytes', () => {
        expect(() => bytesLeToU64(new Uint8Array(7))).toThrow(
            'bytesLeToU64 failed: Value does not contain 8 bytes, but 7',
        );
    });

    it('throws when given more than 8 bytes', () => {
        expect(() => bytesLeToU64(new Uint8Array(9))).toThrow(
            'bytesLeToU64 failed: Value does not contain 8 bytes, but 9',
        );
    });
});
