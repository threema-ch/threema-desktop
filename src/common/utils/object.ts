/**
 * A {@link Record} of unknown keys and values.
 */
export type UnknownRecord = Record<PropertyKey, unknown>;

/**
 * Typed variant of {@link Object.hasOwn}.
 */
export function hasProperty<TKey extends PropertyKey>(
    record: object,
    key: TKey,
): record is object & {[key in TKey]: unknown} {
    return Object.hasOwn(record, key);
}

/**
 * Check whether an object has a specific property.
 *
 * Note: The functionality of this function is equivalent to {@link Object.hasOwn} with the
 *       difference that the `key` parameter needs to exist in the provided object.
 */
export function hasPropertyStrict<TObject extends UnknownRecord, TKey extends keyof TObject>(
    object: TObject,
    key: TKey,
): boolean {
    return Object.hasOwn(object, key);
}

/**
 * This helper type takes a record, and returns a record where the value types don't include
 * `undefined`. Additionally, keys that are always `undefined` are removed from the keys.
 *
 * Example: The type `{a: string, b: boolean | undefined, c: undefined}` is transformed to `{a:
 * string, b: boolean}`.
 */
type RecordWithoutUndefinedValues<R extends UnknownRecord> = {
    // Note: If the part behind "as" evaluates to "never", then the key is removed from the set of keys.
    // See https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#key-remapping-via-as
    [K in keyof R as Exclude<R[K], undefined> extends never ? never : K]: Exclude<R[K], undefined>;
};

/**
 * Return a copy of a record with all keys removed where the value is `undefined`.
 */
export function filterUndefinedProperties<const R extends UnknownRecord>(
    record: R,
): RecordWithoutUndefinedValues<R> {
    return Object.fromEntries(
        Object.entries(record).filter(([key, value]) => value !== undefined),
    ) as RecordWithoutUndefinedValues<R>;
}

/**
 * Returns a copy of the provided object but only with the subset of properties defined in the
 * `props` parameter.
 */
export function pick<T, K extends keyof T = keyof T>(object: Readonly<T>, props: K[]): Pick<T, K> {
    return Object.fromEntries(
        props.filter((key) => hasProperty(object, key)).map((key) => [key, object[key]]),
    ) as Pick<T, K>;
}

/**
 * Returns a copy of the provided object without the subset of properties defined in the
 * `props` parameter.
 */
export function omit<T, K extends keyof T = keyof T>(object: Readonly<T>, props: K[]): Omit<T, K> {
    return Object.fromEntries(
        keys(object)
            .filter((key) => !(props as (keyof T)[]).includes(key))
            .map((key) => [key, object[key]]),
    ) as Omit<T, K>;
}
/**
 * Return whether an object is iterable.
 */
export function isIterable(object: unknown): object is Iterable<unknown> {
    // eslint-disable-next-line no-restricted-syntax
    return object !== null && object !== undefined && Symbol.iterator in Object(object);
}

/**
 * Returns all keys in the provided object.
 *
 * This is a typed version of {@link Object.keys}.
 */
export function keys<T>(object: {[K in keyof T]: unknown}): (keyof T)[] {
    return Object.keys(object) as (keyof T)[];
}

/**
 * Wrap a primitive in a object to allow keeping references.
 */
export class ValueObject<TValue> implements ReadonlyValueObject<TValue> {
    public constructor(public value: TValue) {}
}

/**
 * Readonly interface to {@link ValueObject}.
 *
 * Note that this just makes the held value readonly (i.e. the primitive or reference, if value is
 * an object, its properties may still be writable.)
 */
export interface ReadonlyValueObject<TValue> {
    readonly value: TValue;
}
