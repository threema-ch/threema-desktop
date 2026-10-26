import {describe, expect, it} from 'vitest';

import {byteToHex} from './byte-to-hex.js';

describe('byteToHex', () => {
    it('encodes bytes to a zero-padded lowercase hex string', () => {
        expect(byteToHex(0)).toBe('00');
        expect(byteToHex(1)).toBe('01');
        expect(byteToHex(10)).toBe('0a');
        expect(byteToHex(15)).toBe('0f');
        expect(byteToHex(16)).toBe('10');
        expect(byteToHex(64)).toBe('40');
        expect(byteToHex(254)).toBe('fe');
        expect(byteToHex(255)).toBe('ff');
    });

    it('validates the input by default', () => {
        expect(() => byteToHex(-1)).toThrow('Value -1 is not a valid unsigned byte');
        expect(() => byteToHex(256)).toThrow('Value 256 is not a valid unsigned byte');
        expect(() => byteToHex(1000)).toThrow('Value 1000 is not a valid unsigned byte');
        expect(() => byteToHex(1.5)).toThrow('Value 1.5 is not a valid unsigned byte');
    });

    it('skips validation when `validate` is false', () => {
        // Validation is off → in-range values still encode correctly.
        expect(byteToHex(0, false)).toBe('00');
        expect(byteToHex(255, false)).toBe('ff');
    });
});
