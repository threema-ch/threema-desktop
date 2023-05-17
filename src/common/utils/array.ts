import {type Primitive, type u53} from '~/common/types';

/**
 * Group a large array into multiple smaller arrays with the same max size.
 *
 * Example: Grouping `[1, 2, 3, 4, 5]` with `groupSize` 2 will return `[[1, 2], [3, 4], [5]]`
 */
export function groupArray<T>(array: T[], groupSize: u53): T[][] {
    const arrays = [];
    const groupCount = Math.ceil(array.length / groupSize);
    for (let i = 0; i < groupCount; i++) {
        arrays.push(array.slice(i * groupSize, (i + 1) * groupSize));
    }
    return arrays;
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
                      ? Head
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
 * Note: This only works if the array is marked with `as const`. Otherwise you'll get back the type
 * of an empty string literal.
 *
 * @param arr The const string array to join.
 * @param separator The separator string to join the values with.
 * @returns The concatenated values as a string.
 */
export function joinConstArray<Arr extends readonly string[], Separator extends string = ','>(
    arr: Arr,
    separator: Separator = ',' as Separator,
): Join<Arr, Separator> {
    return arr.join(separator) as Join<Arr, Separator>;
}
