import {describe, expect, it} from 'vitest';

import {u64ToBytesLe} from './u64-to-bytes-le.js';

describe('u64ToBytesLe', () => {
    it('encodes a u64 as 8 little-endian bytes', () => {
        expect(u64ToBytesLe(0x0102030405060708n)).toEqual(
            Uint8Array.of(0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01),
        );
    });

    it('encodes zero', () => {
        expect(u64ToBytesLe(0n)).toEqual(new Uint8Array(8));
    });

    it('encodes the u64 maximum value', () => {
        expect(u64ToBytesLe(2n ** 64n - 1n)).toEqual(
            Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff),
        );
    });
});
