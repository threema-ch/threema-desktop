/**
 * An array who may or may not have been truncated.
 *
 * @property items Contains the (possibly truncated) items.
 * @property limited Determines whether the items of the array have been
 *   truncated.
 */
export interface LimitedArray<T> {
    items: readonly T[];
    limited: boolean;
}

/**
 * Truncates the amount of items in an array to an upper limit.
 *
 * @param array An array of items that may be truncated.
 * @param limit The upper limit amount of items.
 * @returns A limited array interface.
 */
export function limited<T>(array: readonly T[], limit: number): LimitedArray<T> {
    if (array.length > limit) {
        return {
            items: array.slice(0, limit),
            limited: true,
        };
    }
    return {
        items: array,
        limited: false,
    };
}

/**
 * Filters an array asynchronously. Useful if your predicate needs to be awaited.
 *
 * @param predicate A function that accepts up to three arguments. The filter method calls the
 *   predicate function one time for each element in the array.
 * @param array The array to filter.
 * @returns Returns the elements of an array that meet the condition specified in a callback
 *   function.
 */
export async function asyncFilter<T>(
    predicate: (value: T, index: number, array: T[]) => Promise<boolean>,
    array: T[],
): Promise<T[]> {
    const results = (await Promise.allSettled(array.map(predicate))).map((result) =>
        result.status === 'fulfilled' ? result.value : false,
    );
    return array.filter((_, index) => results[index]);
}
