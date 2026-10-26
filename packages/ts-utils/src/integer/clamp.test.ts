import {describe, expect, it} from 'vitest';

import {clamp} from './clamp.js';

describe('clamp', () => {
    it('returns the value when it is within range', () => {
        expect(clamp(5, {min: 0, max: 10})).toBe(5);
    });

    it('clamps to the maximum', () => {
        expect(clamp(20, {min: 0, max: 10})).toBe(10);
    });

    it('clamps to the minimum', () => {
        expect(clamp(-5, {min: 0, max: 10})).toBe(0);
    });

    it('clamps in only one direction when only `min` is provided', () => {
        expect(clamp(-5, {min: 0})).toBe(0);
        expect(clamp(Number.MAX_SAFE_INTEGER, {min: 0})).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('clamps in only one direction when only `max` is provided', () => {
        expect(clamp(20, {max: 10})).toBe(10);
        expect(clamp(Number.MIN_SAFE_INTEGER, {max: 10})).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('returns the value when no bounds are provided', () => {
        expect(clamp(42, {})).toBe(42);
    });

    it('asserts that `max >= min`', () => {
        expect(() => clamp(5, {min: 10, max: 0})).toThrow(
            'Expected clamped value range to satisfy range.max >= range.min',
        );
    });
});
