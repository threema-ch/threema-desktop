// Note: It is safe to disable this rule because we do not call .text or .exec
// eslint-disable-next-line threema/ban-stateful-regex-flags
const escapeRegexRe = /[.*+?^${}()|[\]\\]/gu;

/**
 * Make sure that all chars that have a special meaning in a regex are treated as literals.
 *
 * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 */
export function escapeRegExp(string: string): string {
    return string.replace(escapeRegexRe, '\\$&'); // $& means the whole matched string
}
