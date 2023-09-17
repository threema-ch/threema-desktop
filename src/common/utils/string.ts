import type {RepeatedTuple, u53} from '~/common/types';
import {UTF8} from '~/common/utils/codec';

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

export function getGraphemeClusters(text: string, count = 1): string[] {
    const clusters = [];
    if ('Segmenter' in Intl) {
        // TODO(DESK-837): Remove the cast to any, once the type declaration is part of TS as well
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Truncate the `text` to max `length` grapheme clusters.
 *
 * If the text was truncated, an ellipsis (…) will be appended. The `length` parameter includes the
 * ellipsis.
 */
export function truncate(text: string, length: u53): string {
    const clusters = getGraphemeClusters(text, length + 1);
    if (clusters.length > length) {
        clusters.pop();
        clusters.pop();
        return `${clusters.join('')}…`;
    }
    return text;
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
export function split<N extends u53>(
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
