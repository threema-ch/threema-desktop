import type * as v from '@badrap/valita';

/**
 * Parse an optional parameter which also treats null as non-existent.
 */
export function nullOptional<T>(schema: v.Type<T>): v.Optional<T | undefined> {
    return (
        schema
            .nullable()
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            .map((value) => (value === null ? undefined : value))
            .optional()
    );
}
