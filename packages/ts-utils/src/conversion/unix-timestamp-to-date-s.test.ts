import {describe, expect, it} from 'vitest';

import {unixTimestampToDateS} from './unix-timestamp-to-date-s.js';

describe('unixTimestampToDateS', () => {
    it('converts the unix epoch to 1970-01-01T00:00:00.000Z', () => {
        expect(unixTimestampToDateS(0).toISOString()).toBe('1970-01-01T00:00:00.000Z');
    });

    it('multiplies by 1000 to obtain milliseconds', () => {
        expect(unixTimestampToDateS(60).toISOString()).toBe('1970-01-01T00:01:00.000Z');
    });
});
