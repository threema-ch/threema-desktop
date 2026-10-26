import {describe, expect, it} from 'vitest';

import {u16ToBytesLe} from './u16-to-bytes-le.js';

describe('u16ToBytesLe', () => {
    it('encodes a u16 as 2 little-endian bytes', () => {
        expect(u16ToBytesLe(0x1234)).toEqual(Uint8Array.of(0x34, 0x12));
    });

    it('encodes zero', () => {
        expect(u16ToBytesLe(0)).toEqual(new Uint8Array(2));
    });

    it('encodes the u16 maximum value', () => {
        expect(u16ToBytesLe(0xffff)).toEqual(Uint8Array.of(0xff, 0xff));
    });
});
