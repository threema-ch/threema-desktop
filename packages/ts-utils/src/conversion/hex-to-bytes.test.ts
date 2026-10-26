import {describe, expect, it} from 'vitest';

import {hexToBytes} from './hex-to-bytes.js';

describe('hexToBytes', () => {
    it('returns an empty array for an empty input', () => {
        expect(hexToBytes('')).toEqual(new Uint8Array(0));
    });

    it('validates the input character length', () => {
        expect(() => hexToBytes('0')).toThrow('Invalid hex string length');
        expect(() => hexToBytes('01')).not.toThrow('Invalid hex string length');
        expect(() => hexToBytes('012')).toThrow('Invalid hex string length');
        expect(() => hexToBytes('0123')).not.toThrow('Invalid hex string length');
    });

    it('validates the input characters', () => {
        expect(() => hexToBytes('0 ')).toThrow('Invalid hex character:  ');
        expect(() => hexToBytes('fg')).toThrow('Invalid hex character: g');
        expect(() => hexToBytes('gf')).toThrow('Invalid hex character: g');
        expect(() => hexToBytes('f00bäa')).toThrow('Invalid hex character: ä');
    });

    it('decodes lowercase, uppercase and mixed hex', () => {
        expect(hexToBytes('000102ff')).toEqual(Uint8Array.of(0x00, 0x01, 0x02, 0xff));
        expect(hexToBytes('AABBCC')).toEqual(Uint8Array.of(0xaa, 0xbb, 0xcc));
        expect(hexToBytes('0AbC42')).toEqual(Uint8Array.of(0x0a, 0xbc, 0x42));
    });
});
