import * as v from '@badrap/valita';
import type Long from 'long';

/**
 * Ensure that a value is an instance of a certain type.
 *
 * Note: May not be used with `Long`! To check if a value is a `Long`, use {@link Long.isLong}. In
 * the context of Valita, use `unsignedLongAsU64`.
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: instanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: instanceOf(Date),
 *       etcetera: instanceOf(Worker),
 *     });
 */
export function instanceOf<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: abstract new (...args: any) => T,
): T extends Long ? never : v.Type<T> {
    return v
        .unknown()
        .assert<T>(
            (value) => value instanceof t,
            `expected an instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        ) as T extends Long ? never : v.Type<T>;
}
