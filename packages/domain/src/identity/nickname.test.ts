import {describe, expect, it} from 'vitest';

import {ensureNickname, isNickname} from './nickname.js';

describe('isNickname', () => {
    it('accepts a non-empty string', () => {
        // Assert
        expect(isNickname('Nick')).toBe(true);
    });

    it.each(['', 42, undefined])('rejects %o', (value) => {
        // Assert
        expect(isNickname(value)).toBe(false);
    });
});

describe('ensureNickname', () => {
    it('returns a valid nickname', () => {
        // Assert
        expect(ensureNickname('Nick')).toBe('Nick');
    });

    it('rejects an empty nickname', () => {
        // Assert
        expect(() => ensureNickname('')).toThrow("Not a valid nickname: ''");
    });
});
