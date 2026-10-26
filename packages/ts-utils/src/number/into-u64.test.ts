import Long from 'long';
import {describe, expect, it} from 'vitest';

import {unsignedLongToU64} from './into-u64.js';

describe('unsignedLongToU64', () => {
    const testCases: [input: Long, output: bigint][] = [
        [Long.fromNumber(0, true), 0n],
        [Long.fromNumber(10, true), 10n],
        [Long.fromNumber(4294967297, true), 4294967297n],
        [Long.fromValue(`${Number.MAX_SAFE_INTEGER}`, true), BigInt(Number.MAX_SAFE_INTEGER)],
    ];

    for (const [input, expected] of testCases) {
        it(`converts ${input.toString()} to ${expected}n`, () => {
            expect(unsignedLongToU64(input)).toBe(expected);
        });
    }

    it('throws if a signed Long is passed', () => {
        expect(() => unsignedLongToU64(Long.fromNumber(20, false))).toThrow(
            'Long value is not unsigned',
        );
    });
});
