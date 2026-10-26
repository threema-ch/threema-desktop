import {describe, expect, it} from 'vitest';

import {bytesToHex} from './bytes-to-hex.js';

describe('bytesToHex', () => {
    it('encodes an empty array to an empty string', () => {
        expect(bytesToHex(new Uint8Array(0))).toBe('');
    });

    it('encodes bytes to a lowercase hex string', () => {
        expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255))).toBe('00010a0f1040feff');
    });

    it('encodes bytes with a single-character separator', () => {
        expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255), ':')).toBe(
            '00:01:0a:0f:10:40:fe:ff',
        );
    });

    it('encodes bytes with a multi-character separator', () => {
        expect(bytesToHex(Uint8Array.of(0, 1, 10, 15, 16, 64, 254, 255), 'lol')).toBe(
            '00lol01lol0alol0flol10lol40lolfelolff',
        );
    });

    it('returns an empty string for an empty input even when a separator is provided', () => {
        expect(bytesToHex(new Uint8Array(0), ':')).toBe('');
        expect(bytesToHex(new Uint8Array(0), 'lol')).toBe('');
    });
});
