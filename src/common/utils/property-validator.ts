import {type WeakOpaque} from '~/common/types';

/**
 * Requires the wrapped type properties to be matched exactly
 * (i.e. no additional properties may be present).
 *
 * This is useful for e.g. database updates to not accidently update undesired
 * columns.
 *
 * Unfortunately we cannot enforce this via TypeScript, see:
 * https://github.com/microsoft/TypeScript/issues/12936
 */
export type Exact<T> = WeakOpaque<T, {readonly Exact: unique symbol}>;

/**
 * Ensures that the properties of the provided data exactly match the
 * expectations (i.e. no further properties are provided).
 */
export type ExactPropertyValidator<T> = (data: T) => Exact<T>;

/** Declares a property as required for the {@link ExactPropertyValidator} */
export const REQUIRED = Symbol('property-required');

/** Declares a property as optional for the {@link ExactPropertyValidator} */
export const OPTIONAL = Symbol('property-optional');

/**
 * Create a validator that ensures that provided data exactly matches the expected fields (i.e. no
 * further properties are provided and all required properties have been provided).
 *
 * @param name Name passed to the assertion function for debugging
 * @param schema The property type declaration map.
 * @returns A data property validator.
 */
export function createExactPropertyValidator<T>(
    name: string,
    schema: {
        [K in keyof T]-?: undefined extends T[K] ? typeof OPTIONAL : typeof REQUIRED;
    },
): ExactPropertyValidator<T> {
    if (!import.meta.env.DEBUG) {
        return (data: T): Exact<T> => data as Exact<T>;
    }

    const required: ReadonlySet<string> = new Set(
        Object.entries(schema)
            .filter(([_, type]) => type === REQUIRED)
            .map(([key, _]) => key),
    );
    const optional: ReadonlySet<string> = new Set(
        Object.entries(schema)
            .filter(([_, type]) => type === OPTIONAL)
            .map(([key, _]) => key),
    );

    return (data: T): Exact<T> => {
        const requiredKeysInSchema = new Set(required);
        const optionalKeysInSchema = new Set(optional);

        for (const key of Object.keys(data)) {
            if (requiredKeysInSchema.has(key)) {
                requiredKeysInSchema.delete(key);
                continue;
            }
            if (optionalKeysInSchema.has(key)) {
                optionalKeysInSchema.delete(key);
                continue;
            }
            throw new Error(`Expected unknown key '${key}' to not be present in '${name}'`);
        }

        if (requiredKeysInSchema.size > 0) {
            const missingKeys = [...requiredKeysInSchema].join("', '");
            throw new Error(`Expected required keys '${missingKeys}' to be present in '${name}'`);
        }

        return data as Exact<T>;
    };
}
