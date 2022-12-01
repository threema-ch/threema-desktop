/**
 * Helper functions for valita.
 */

import * as v from '@badrap/valita';

/**
 * Ensure that a value is an instance of a certain type.
 *
 * Note that the return type can _not_ be chained with `.optional()`!
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: instanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: instanceOf(Date),
 *       etcetera: instanceOf(Worker),
 *     });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function instanceOf<T>(t: abstract new (...args: any) => T): v.Type<T> {
    return v
        .unknown()
        .assert<T>(
            (value) => value instanceof t,
            `expected an instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        );
}

/**
 * Ensure that a value is an instance of a certain type, or undefined.
 *
 * Example:
 *
 *     const t = v.object({
 *       fourBytes: optionalInstanceOf(Uint8Array).assert((a) => a.length === 4),
 *       timestamp: optionalInstanceOf(Date),
 *     });
 */
export function optionalInstanceOf<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: abstract new (...args: any) => T,
): v.Type<T | undefined> {
    return v
        .unknown()
        .assert<T | undefined>(
            (value) => value instanceof t || value === undefined,
            `expected an optional instance of ${t.name !== '' ? t.name : 'an anonymous type'}`,
        );
}

/**
 * Parse an optional parameter which also treats null as non-existent.
 */
export function nullOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return v
        .union(v.null(), schema)
        .map((value) => (value === null ? undefined : value))
        .optional();
}
