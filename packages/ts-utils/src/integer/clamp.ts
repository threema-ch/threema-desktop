import {assert} from '../meta/assert.js';

import type {i53} from './i53.js';

/**
 * Limits the supplied value to the given range. `min` and `max` values are optional, so that the
 * value can only be clamped in one direction if necessary.
 *
 * IMPORTANT: The caller must ensure that {@link range.max} >= {@link range.min}.
 *
 * @param value The number to clamp.
 * @param range Configuration of `min` and `max` values.
 * @returns Clamped `value` to satisfy `min` and `max` constraints.
 */
export function clamp(value: i53, range: {readonly min?: i53; readonly max?: i53}): i53 {
    const min = range.min ?? Number.MIN_SAFE_INTEGER;
    const max = range.max ?? Number.MAX_SAFE_INTEGER;
    assert(max >= min, 'Expected clamped value range to satisfy range.max >= range.min');
    return Math.max(Math.min(value, max), min);
}
