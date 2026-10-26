import {describe, expect, it} from 'vitest';

import {bytesLeToU16} from './bytes-le-to-u16.js';

describe('bytesLeToU16', () => {
    it('decodes 2 little-endian bytes to a u16', () => {
        expect(bytesLeToU16(Uint8Array.of(0x34, 0x12))).toBe(0x1234);
    });

    it('decodes all-zero bytes to 0', () => {
        expect(bytesLeToU16(new Uint8Array(2))).toBe(0);
    });

    it('decodes all-0xff bytes to the u16 max', () => {
        expect(bytesLeToU16(Uint8Array.of(0xff, 0xff))).toBe(0xffff);
    });

    it('throws when given fewer than 2 bytes', () => {
        expect(() => bytesLeToU16(new Uint8Array(1))).toThrow(
            'bytesLeToU16 failed: Value does not contain 2 bytes, but 1',
        );
    });

    it('throws when given more than 2 bytes', () => {
        expect(() => bytesLeToU16(new Uint8Array(3))).toThrow(
            'bytesLeToU16 failed: Value does not contain 2 bytes, but 3',
        );
    });
});
