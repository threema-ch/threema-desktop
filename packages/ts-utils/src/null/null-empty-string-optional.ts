import * as v from '@badrap/valita';

/**
 * Parse an optional parameter which also treats null and empty string as non-existent.
 */
export function nullEmptyStringOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return v
        .union(v.null(), v.literal(''), schema)
        .map((value) => (value === null || value === '' ? undefined : value))
        .optional();
}
