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
    return Object.prototype.hasOwnProperty.call(object, key);
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
 * Return whether an object is iterable.
 */
export function isIterable(object: unknown): object is Iterable<unknown> {
    if (object === null || object === undefined) {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (object as any)[Symbol.iterator] === 'function';
}
