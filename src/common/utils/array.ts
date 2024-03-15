import type {Primitive, ReadonlyUint8Array, u53, u8} from '~/common/types';
import {unwrap} from '~/common/utils/assert';

/**
 * Split a large array into multiple smaller arrays with the same max size.
 *
 * @example
 * ```ts
 * const chunked = chunk([1, 2, 3, 4, 5], 2); // Returns `[[1, 2], [3, 4], [5]]`.
 * ```
 */
export function chunk<T>(array: T[], chunkSize: u53): T[][] {
    const arrays = [];
    const groupCount = Math.ceil(array.length / chunkSize);
    for (let i = 0; i < groupCount; i++) {
        arrays.push(array.slice(i * chunkSize, (i + 1) * chunkSize));
    }
    return arrays;
}

/**
 * Split an array into distinct chunks, grouped by the result of the grouping function.
 *
 * @example
 * ```ts
 * const chunked = chunkBy([1.5, 2.5, 2.75, 3], (value) => Math.floor(value)); // Returns `[ [1.5], [2.5, 2.75], [3] ]`;
 * ```
 */
export function chunkBy<K, V>(array: readonly V[], groupBy: (value: V) => K): readonly V[][] {
    return Array.from(group(array, groupBy).values());
}

/**
 * Split an array into distinct sets, grouped by the result of the keying function.
 *
 * @example
 * ```ts
 * const grouped = group([1.5, 2.5, 2.75, 3], (value) => Math.floor(value)); // Returns `{ 1: [1.5], 2: [2.5, 2.75], 3: [3] }`;
 * ```
 */
export function group<K, V>(array: readonly V[], getKey: (value: V) => K): ReadonlyMap<K, V[]> {
    return array.reduce((acc, curr) => {
        const key = getKey(curr);
        acc.set(key, [...(acc.get(key) ?? []), curr]);
        return acc;
    }, new Map<K, V[]>());
}

/**
 * Type for an array of primitive values concatenated to a string. Handles `null` and `undefined` by
 * not including them.
 *
 * Example: The type `Concatenate<["some", "string", undefined]>` will be equivalent to the type
 * `"somestring"`.
 */
export type Concatenate<
    Arr extends readonly Primitive[],
    Acc extends string = '',
    // eslint-disable-next-line no-restricted-syntax
> = Arr extends readonly [infer Head, ...infer Rest]
    ? Head extends NonNullable<Primitive>
        ? Rest extends readonly Primitive[]
            ? Concatenate<Rest, `${Acc}${Head}`>
            : Acc
        : Rest extends readonly Primitive[]
          ? Concatenate<Rest, `${Acc}`>
          : Acc
    : Acc;

/**
 * Type for a joined array of primitive values. Modeled after what the built-in
 * `Array.prototype.join()` method would return.
 *
 * Examples:
 *  - `Join<[1, 2, 3]>` is equivalent to `"1,2,3"`.
 *  - `Join<["hello", "world"], " ">` is equivalent to `"hello world"`.
 *  - `Join<[null, null, null], "_">` is equivalent to `"__"`.
 *  - `Join<[1, 2, 3, undefined, 4, undefined, null], ",">` is equivalent to `"1,2,3,,4,,"`.
 */
export type Join<
    Arr extends readonly Primitive[],
    Separator extends string = ',',
    Acc extends string = '',
    // eslint-disable-next-line no-restricted-syntax
> = Arr extends readonly [infer Head, ...infer Rest]
    ? Rest extends readonly Primitive[]
        ? Join<
              Rest,
              Separator,
              Head extends Primitive
                  ? Acc extends ''
                      ? `${Head}`
                      : // eslint-disable-next-line no-restricted-syntax
                        Concatenate<readonly [Acc, Separator, Head]>
                  : never
          >
        : never
    : Acc;

/**
 * Creates and returns a new string by concatenating all of the elements in a const string array,
 * separated by commas or a specified separator string. The return type will contain the appropriate
 * string literals.
 *
 * @param arr The const string array to join.
 * @param separator The separator string to join the values with.
 * @returns The concatenated values as a string.
 */
export function joinConstArray<const Arr extends readonly string[], Separator extends string = ','>(
    arr: Arr,
    separator: Separator = ',' as Separator,
): Join<Arr, Separator> {
    return arr.join(separator) as Join<Arr, Separator>;
}

/**
 * Iterate in reverse direction over the array.
 *
 * Note: Mutation of the array while iterating leads to undefined behaviour!
 */
export function entriesReverse(
    array: ReadonlyUint8Array,
): IterableIterator<readonly [index: u53, value: u8]>;
export function entriesReverse<T>(
    array: readonly T[],
): IterableIterator<readonly [index: u53, value: T]>;
export function* entriesReverse(
    array: ReadonlyUint8Array | readonly unknown[],
): IterableIterator<readonly [index: u53, value: unknown]> {
    if (array.length === 0) {
        return;
    }
    for (let index = array.length - 1; index >= 0; --index) {
        yield [index, unwrap(array[index])];
    }
}

/**
 * Filters an array using an async predicate.
 *
 * @param predicate A function that accepts up to three arguments. The filter method calls the
 *   predicate function one time for each element in the array.
 * @param array The array to filter.
 * @returns Returns the elements of an array that meet the condition specified in a callback
 *   function.
 */
export async function filterAsync<T>(
    predicate: (value: T, index: u53, array: T[]) => Promise<boolean>,
    array: T[],
): Promise<T[]> {
    const results = (await Promise.allSettled(array.map(predicate))).map((result) =>
        result.status === 'fulfilled' ? result.value : false,
    );
    return array.filter((_, index) => results[index]);
}
