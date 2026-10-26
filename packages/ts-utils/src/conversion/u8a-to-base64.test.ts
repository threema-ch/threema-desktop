import {describe, expect, it} from 'vitest';

import {u8aToBase64} from './u8a-to-base64.js';

describe('u8aToBase64', () => {
    it('encodes a byte array to a base64 string', () => {
        expect(u8aToBase64(Uint8Array.of(1, 2, 3))).toBe('AQID');
    });

    it('encodes an empty byte array to an empty string', () => {
        expect(u8aToBase64(new Uint8Array(0))).toBe('');
    });

    it('encodes with the standard alphabet by default', () => {
        // `0xfb, 0xff, 0xbf` round-trips through `+` and `/` in the standard alphabet.
        expect(u8aToBase64(Uint8Array.of(0xfb, 0xff, 0xbf))).toBe('+/+/');
    });

    it('encodes with the URL-safe alphabet when requested', () => {
        expect(u8aToBase64(Uint8Array.of(0xfb, 0xff, 0xbf), {urlSafe: true})).toBe('-_-_');
    });

    it('encodes with the standard alphabet when `urlSafe` is explicitly false', () => {
        expect(u8aToBase64(Uint8Array.of(0xfb, 0xff, 0xbf), {urlSafe: false})).toBe('+/+/');
    });
});
