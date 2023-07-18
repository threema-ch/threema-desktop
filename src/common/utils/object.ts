import {type u53} from '~/common/types';

/**
 * Check whether an object has a specific property.
 *
 * Note: The functionality of this function is equivalent to {@link Object.hasOwn} with the
 *       difference that the `key` parameter needs to exist in the provided object.
 */
export function hasProperty<
    TObject extends Record<string | u53 | symbol, unknown>,
    TKey extends keyof TObject,
>(object: TObject, key: TKey): boolean {
    return Object.hasOwn(object, key);
}

/**
 * Remove all properties from an object whose value is undefined.
 */
export function purgeUndefinedProperties<TObject extends Record<string | u53 | symbol, unknown>>(
    object: TObject,
): TObject {
    return Object.fromEntries(
        Object.entries(object).filter(([key, value]) => value !== undefined),
    ) as TObject;
}

/**
 * Returns a copy of the provided object but only with the subset of properties defined in the
 * `props` parameter.
 */
export function pick<T, K extends keyof T = keyof T>(
    object: Readonly<Partial<T>>,
    props: K[],
): Partial<Pick<T, K>> {
    return Object.fromEntries(
        props.filter((key) => key in object).map((key) => [key, object[key]]),
    ) as Partial<Pick<T, K>>;
}

/**
 * Return whether an object is iterable.
 */
export function isIterable(object: unknown): object is Iterable<unknown> {
    if (object === null || object === undefined) {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (object as any)[Symbol.iterator] === 'function';
}

/**
 * Returns all keys in the provided object.
 */
export function keys<T>(object: {[key in keyof T]: unknown}): (keyof T)[] {
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
