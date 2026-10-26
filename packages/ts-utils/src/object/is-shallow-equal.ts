import {isObject} from './is-object.js';

/**
 * Returns whether the given values are equal, comparing object or array members shallowly instead
 * of only by identity.
 *
 * Note: This is a primitive implementation, which only handles arrays and plain objects, and
 * compares everything else by identity.
 */
export function isShallowEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
            return false;
        }
        return left.every((value, index) => Object.is(value, right[index]));
    }

    if (!isObject(left) || !isObject(right)) {
        return false;
    }

    const keys = Object.keys(left);
    if (keys.length !== Object.keys(right).length) {
        return false;
    }
    return keys.every(
        (key) =>
            Object.hasOwn(right, key) &&
            Object.is(
                (left as Record<string, unknown>)[key],
                (right as Record<string, unknown>)[key],
            ),
    );
}
