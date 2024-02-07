import type {RepeatedTuple, u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import {escapeRegExp} from '~/common/utils/regex';

/**
 * Get the length in bytes of an utf-8 encoded `string`.
 *
 * @param str The utf-8 `string` to get the byte length from.
 * @returns The byte length of the supplied `str.
 */
export function getUtf8ByteLength(str: string): u53 {
    return UTF8.encode(str).byteLength;
}

/**
 * Sort function that sorts strings in a case-insensitive and locale-aware way. If two strings are
 * identical except for the case, then lowercase will be sorted first.
 */
export function localeSort(a: string, b: string): u53 {
    return new Intl.Collator(undefined, {
        usage: 'sort',
        caseFirst: 'lower',
    }).compare(a, b);
}

// TODO(DESK-1334): Use the system language instead of "en".
export function getGraphemeClusters(text: string, count = 1): string[] {
    const clusters = [];
    if (Object.hasOwn(Intl, 'Segmenter')) {
        const segmenter = new Intl.Segmenter('en', {granularity: 'grapheme'});
        const segments = segmenter.segment(text);
        const iterator = segments[Symbol.iterator]();
        for (let i = 0; i < count; i++) {
            const segment = iterator.next();
            if (segment.done !== true) {
                clusters.push(segment.value.segment);
            } else {
                break;
            }
        }
    } else {
        for (let i = 0; i < Math.min(count, text.length); i++) {
            clusters.push(text.slice(i, i + 1));
        }
    }
    return clusters;
}

/**
 * A true string literal, but not a plain string.
 */
type StringLiteral<T extends string> = string extends T ? never : T;

/**
 * A ".toLowerCase()" implementation that fully supports TypeScript string literal types.
 */
export function literalToLowercase<S extends string>(string: StringLiteral<S>): Lowercase<S> {
    return string.toLowerCase() as Lowercase<S>;
}

/**
 * Split a string into the first `nItems` and gather the rest.
 *
 * @throws {Error} if `value` does not contain at least `nItems`.
 */
export function splitAtLeast<N extends u53>(
    value: string,
    splitter: string,
    nItems: N,
): {items: RepeatedTuple<string, N>; rest: string[]} {
    const rest = value.split(splitter);
    const items = rest.splice(0, nItems);
    if (items.length !== nItems) {
        throw new Error(`Expected ${nItems} after split, got ${items.length}`);
    }
    return {
        items: items as unknown as RepeatedTuple<string, N>,
        rest,
    };
}

/**
 * Truncates a given string accorting to the given {@link mode} and adds an ellipsis if the string
 * was truncated. Note: The resulting length will equal `max`, including the ellipsis, if it was
 * truncated.
 *
 * - `'around'`: Tries to keep the given substrings ({@link focuses}) visible. If multiple focus
 *   values are given, the algorithm attempts a best-effort approach to keep as many as possible in
 *   view without disrespecting the `max` limit.
 * - `'both'`: Truncate equally from both ends.
 * - `'end'`: Truncate from the end of the text, and keep the start.
 * - `'start'`: Truncate from the start of the string, and keep only the end.
 *
 * @param text The input string to truncate.
 * @param max The maximum length of the resulting truncated text.
 * @param mode The strategy to use for truncating.
 * @param focuses An array of substrings considered as "focus points." The truncation will attempt
 *   to keep these focus points as centered as possible.
 * @param fallback The mode to use as a fallback if truncating using mode `'around'` fails.
 * @returns The truncated string adhering to the specified conditions.
 */
export function truncate(
    text: string | string[],
    max: u53,
    mode: 'around',
    focuses: string[],
    fallback: 'both' | 'end' | 'start',
): string;
export function truncate(text: string | string[], max: u53, mode: 'both' | 'end' | 'start'): string;
export function truncate(
    text: string | string[],
    max: u53,
    mode: 'around' | 'both' | 'end' | 'start' = 'end',
    focuses?: string[],
    fallback: 'both' | 'end' | 'start' = 'end',
): string {
    if (mode !== 'around') {
        return truncateEnds(text, max, mode);
    }

    const graphemeClusters = text instanceof Array ? text : getGraphemeClusters(text, text.length);
    if (graphemeClusters.length <= max) {
        return graphemeClusters.join('');
    }

    // If no `focuses` are given, truncate according to `mode`.
    if (focuses === undefined || focuses.length === 0) {
        return truncateEnds(graphemeClusters, max, fallback);
    }

    // eslint-disable-next-line threema/ban-stateful-regex-flags
    const regexp = new RegExp(focuses.map((focus) => `(${escapeRegExp(focus)})`).join('|'), 'ug');
    const focusIndices = [...graphemeClusters.join('').matchAll(regexp)].flatMap(({index}) =>
        index === undefined ? [] : [index],
    );

    // If no matches have been found, truncate according to `mode`.
    if (focusIndices.length === 0) {
        return truncateEnds(graphemeClusters, max, fallback);
    }

    // Calculate the summed delta to its two neighbors for each `focusIndex` and find the (first)
    // item with the lowest score. Note: For the first and last item, the delta to its single
    // neighbor is simply doubled.
    let lowestDelta: u53 = Number.MAX_SAFE_INTEGER;
    let indexOfLowestDelta = 0;
    for (const [index, focusIndex] of focusIndices.entries()) {
        const left = focusIndices[index - 1];
        const right = focusIndices[index + 1];

        let delta = lowestDelta;
        if (left !== undefined && right !== undefined) {
            delta = focusIndex - left + right - focusIndex;
        } else if (left !== undefined) {
            delta = (focusIndex - left) * 2;
        } else if (right !== undefined) {
            delta = (right - focusIndex) * 2;
        } else {
            // There is only one `focusIndex`, so set it's `delta` to `0`, so it becomes the
            // `lowestDelta`.
            delta = 0;
        }

        if (delta < lowestDelta) {
            lowestDelta = delta;
            indexOfLowestDelta = focusIndex;
        }
    }

    let start = Math.max(0, indexOfLowestDelta - Math.ceil(max / 2));
    let end = Math.min(graphemeClusters.length, start + max);

    // If `end` overflows, move window.
    if (end - start < max) {
        start = Math.max(0, end - max);
        end = graphemeClusters.length;
    }

    // Truncate around lowest `focusIndex`.
    if (start === 0) {
        return `${graphemeClusters.slice(start, end - 1).join('')}…`;
    } else if (end === graphemeClusters.length) {
        return `…${graphemeClusters.slice(start + 1, end).join('')}`;
    }

    return `…${graphemeClusters.slice(start + 1, end - 1).join('')}…`;
}

/**
 * Cuts the given {@link text}, so that its grapheme cluster count amounts up to (but does not
 * exceed) {@link max}. Note: If the given value for {@link text} is an array, it is assumed to
 * already be clustered.
 *
 * Modes:
 *
 * - `'both'`: Truncate equally from both ends.
 * - `'end'`: Truncate from the end of the text, and keep the start.
 * - `'start'`: Truncate from the start of the string, and keep only the end.
 *
 * @param text The string to truncate.
 * @param max Maximum grapheme cluster length of the truncated string.
 * @param mode Which side of the text to truncate from.
 * @returns The truncated string with a maximum length of {@link max}.
 */
function truncateEnds(
    text: string | string[],
    max: u53,
    mode: 'both' | 'end' | 'start' = 'end',
): string {
    const graphemeClusters = text instanceof Array ? text : getGraphemeClusters(text, text.length);
    if (graphemeClusters.length <= max) {
        return graphemeClusters.join('');
    }

    switch (mode) {
        case 'both':
            return truncateBoth(graphemeClusters, max);

        case 'end':
            return truncateEnd(graphemeClusters, max);

        case 'start':
            return truncateStart(graphemeClusters, max);

        default:
            return unreachable(mode);
    }
}

/**
 * Cuts equally from both ends of the given {@link text}, so that its grapheme cluster count amounts
 * up to (but does not exceed) {@link max}. Note: If the given value for {@link text} is an array,
 * it is assumed to already be clustered.
 */
function truncateBoth(text: string | string[], max: u53): string {
    const graphemeClusters = text instanceof Array ? text : getGraphemeClusters(text, text.length);
    if (graphemeClusters.length <= max) {
        return graphemeClusters.join('');
    }

    const amountToTruncate = (graphemeClusters.length - max) / 2;

    const amountToTruncateFromStart = Math.floor(amountToTruncate);
    const amountToTruncateFromEnd = Number.isInteger(amountToTruncate)
        ? amountToTruncateFromStart
        : amountToTruncateFromStart + 1;

    return `…${graphemeClusters
        .slice(amountToTruncateFromStart + 1, -amountToTruncateFromEnd - 1)
        .join('')}…`;
}

/**
 * Cuts off the end of the given {@link text}, so that its grapheme cluster count amounts up to (but
 * does not exceed) {@link max}. Note: If the given value for {@link text} is an array, it is
 * assumed to already be clustered.
 */
function truncateEnd(text: string | string[], max: u53): string {
    const graphemeClusters = text instanceof Array ? text : getGraphemeClusters(text, text.length);

    if (graphemeClusters.length <= max) {
        return graphemeClusters.join('');
    }

    return `${graphemeClusters.slice(0, max - 1).join('')}…`;
}

/**
 * Cuts off the start of the given {@link text}, so that its grapheme cluster count amounts up to
 * (but does not exceed) {@link max}. Note: If the given value for {@link text} is an array, it is
 * assumed to already be clustered.
 */
function truncateStart(text: string | string[], max: u53): string {
    const graphemeClusters = text instanceof Array ? text : getGraphemeClusters(text, text.length);
    if (graphemeClusters.length <= max) {
        return graphemeClusters.join('');
    }

    return `…${graphemeClusters.slice(-max - 1).join('')}`;
}
