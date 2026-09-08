import {describe, expect, it} from 'vitest';

import {isShallowEqual} from './is-shallow-equal.js';

describe('isShallowEqual', () => {
    it('returns true for identical values', () => {
        // Arrange
        const value = {a: 1};

        // Act & assert
        expect(isShallowEqual(value, value)).toBe(true);
    });

    it('compares primitives', () => {
        // Act & assert
        expect(isShallowEqual(1, 1)).toBe(true);
        expect(isShallowEqual('a', 'a')).toBe(true);
        expect(isShallowEqual(undefined, undefined)).toBe(true);
        expect(isShallowEqual(null, null)).toBe(true);
        expect(isShallowEqual(1, 2)).toBe(false);
        expect(isShallowEqual(undefined, null)).toBe(false);
    });

    // `Object.is` is used rather than `===`, so that these do not surprise a caller.
    it('treats NaN as equal to itself, and the zeroes as distinct', () => {
        // Act & assert
        expect(isShallowEqual(Number.NaN, Number.NaN)).toBe(true);
        expect(isShallowEqual(0, -0)).toBe(false);
    });

    it('compares the properties of objects', () => {
        // Act & assert
        expect(isShallowEqual({a: 1, b: 2}, {a: 1, b: 2})).toBe(true);
        // Note: Order of the properties must not matter.
        expect(isShallowEqual({a: 1, b: 2}, {b: 2, a: 1})).toBe(true);
        expect(isShallowEqual({a: 1, b: 2}, {a: 1, b: 3})).toBe(false);
    });

    it('returns false for objects which do not hold the same properties', () => {
        // Act & assert
        expect(isShallowEqual({a: 1}, {a: 1, b: 2})).toBe(false);
        expect(isShallowEqual({a: 1, b: 2}, {a: 1})).toBe(false);
        expect(isShallowEqual({a: 1}, {b: 1})).toBe(false);
    });

    it('compares the items of arrays', () => {
        // Act & assert
        expect(isShallowEqual([1, 2], [1, 2])).toBe(true);
        expect(isShallowEqual([], [])).toBe(true);
        expect(isShallowEqual([1, 2], [2, 1])).toBe(false);
        expect(isShallowEqual([1], [1, 2])).toBe(false);
    });

    it('does not traverse into nested values', () => {
        // Act & assert
        expect(isShallowEqual({a: {b: 1}}, {a: {b: 1}})).toBe(false);
        expect(isShallowEqual([[1]], [[1]])).toBe(false);
    });

    it('compares a nested value which kept its identity', () => {
        // Arrange
        const nested = {b: 1};

        // Act & assert
        expect(isShallowEqual({a: nested}, {a: nested})).toBe(true);
    });

    it('does not consider an array equal to an object', () => {
        // Act & assert
        expect(isShallowEqual([], {})).toBe(false);
        expect(isShallowEqual(['a'], {a: 1})).toBe(false);
    });

    it('does not consider an object equal to a primitive', () => {
        // Act & assert
        expect(isShallowEqual({}, undefined)).toBe(false);
        expect(isShallowEqual(undefined, {})).toBe(false);
        expect(isShallowEqual({}, null)).toBe(false);
    });
});
