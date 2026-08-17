import * as v from '@badrap/valita';
import Long from 'long';

import type {u64} from '../integer/u64.js';

import {intoU64} from './into-u64.js';

/**
 * Expect a `Long` value (validated through `Long.isLong`), then convert it into an u64.
 */
export function unsignedLongAsU64(): v.Type<u64> {
    return v
        .unknown()
        .chain((value: unknown) => {
            if (Long.isLong(value)) {
                // When Protobuf falls back to the default value of 0, this is a signed `Long`
                // value. Convert to unsigned.
                if (value.isZero()) {
                    return v.ok(Long.UZERO);
                }

                return v.ok(value);
            }
            return v.err(
                `Expected a Long value, but "Long.isLong" returns false for value "${value}" with type "${typeof value}"`,
            );
        })
        .map(intoU64);
}
