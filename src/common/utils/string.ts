import {type u53} from '~/common/types';

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
        // TODO(WEBMD-837): Remove the cast to any, once the type declaration is part of TS as well
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
