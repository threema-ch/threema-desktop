/**
 * Split an array into distinct sets, grouped by the result of the keying function.
 *
 * @example
 * ```ts
 * const grouped = groupBy([1.5, 2.5, 2.75, 3], (value) => Math.floor(value)); // Returns `Map { 1 => [1.5], 2 => [2.5, 2.75], 3 => [3] }`;
 * ```
 */
export function groupBy<K, V>(array: readonly V[], fn: (value: V) => K): ReadonlyMap<K, V[]> {
    return array.reduce((acc, curr) => {
        const key = fn(curr);
        acc.set(key, [...(acc.get(key) ?? []), curr]);
        return acc;
    }, new Map<K, V[]>());
}
