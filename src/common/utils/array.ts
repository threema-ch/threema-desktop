import {type u53} from '~/common/types';

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
