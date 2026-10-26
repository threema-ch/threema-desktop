import {describe, expect, it} from 'vitest';

import {hexWithSeparatorToBytes} from './hex-with-separator-to-bytes.js';

describe('hexWithSeparatorToBytes', () => {
    it('returns an empty array for an empty input regardless of separator length', () => {
        expect(hexWithSeparatorToBytes('', 1)).toEqual(new Uint8Array(0));
        expect(hexWithSeparatorToBytes('', 2)).toEqual(new Uint8Array(0));
        expect(hexWithSeparatorToBytes('', 3)).toEqual(new Uint8Array(0));
    });

    it('validates the input character length', () => {
        expect(() => hexWithSeparatorToBytes('0', 1)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01', 1)).not.toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01:', 1)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01:', 2)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01:2', 2)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01:23', 1)).not.toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01::23', 2)).not.toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01:23:', 1)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01::23:', 2)).toThrow('Invalid hex string length');
        expect(() => hexWithSeparatorToBytes('01::23::', 2)).toThrow('Invalid hex string length');
    });

    it('validates the input characters', () => {
        expect(() => hexWithSeparatorToBytes('0 ', 1)).toThrow('Invalid hex character:  ');
        expect(() => hexWithSeparatorToBytes('fg', 1)).toThrow('Invalid hex character: g');
        expect(() => hexWithSeparatorToBytes('gf', 1)).toThrow('Invalid hex character: g');
        expect(() => hexWithSeparatorToBytes('f0:0b:äa', 1)).toThrow('Invalid hex character: ä');
    });

    it('decodes lowercase, uppercase and mixed hex with a separator', () => {
        expect(hexWithSeparatorToBytes('00:01:02:ff', 1)).toEqual(
            Uint8Array.of(0x00, 0x01, 0x02, 0xff),
        );
        expect(hexWithSeparatorToBytes('AA:BB:CC', 1)).toEqual(Uint8Array.of(0xaa, 0xbb, 0xcc));
        expect(hexWithSeparatorToBytes('0A:bC:42', 1)).toEqual(Uint8Array.of(0x0a, 0xbc, 0x42));
    });
});
