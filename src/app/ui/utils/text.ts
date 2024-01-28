import {markify, TokenType} from '@threema/threema-markup';
import autolinker from 'autolinker';

import type {I18nType} from '~/app/ui/i18n-types';
import type {u53, WeakOpaque} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {escapeRegExp} from '~/common/utils/regex';
import {truncate} from '~/common/utils/string';
import type {AnyMention} from '~/common/viewmodel/utils/mentions';

export type SanitizedHtml = WeakOpaque<string, {readonly SanitizedHtml: unique symbol}>;

export interface SanitizeAndParseTextToHtmlOptions {
    /** The {@link Mention}s to search for and replace in the text. */
    readonly mentions?: AnyMention | AnyMention[];
    /** The highlights to search for and replace in the text. */
    readonly highlights?: string | string[];
    /** If mentions should link to the conversation with the respective contact. */
    readonly shouldLinkMentions?: boolean;
    /** If simple markup tokens (bold, italic, strikethrough) should be replaced. */
    readonly shouldParseMarkup?: boolean;
    /** If links should be detected and replaced. */
    readonly shouldParseLinks?: boolean;
    /**
     * Truncates the text to the desired length, if given. Note: If `highlights` are given, the
     * truncation will adjust to try to keep them visible.
     */
    readonly truncate?: u53;
}

/**
 * Parses some text and replaces various tokens with HTML. This is useful to render messages and
 * message previews with formatting.
 *
 * Note: Input text will be sanitized.
 *
 * @param text The input text
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param options See {@link SanitizeAndParseTextToHtmlOptions} for docs
 * @returns The text containing the specified tokens replaced with HTML.
 */
export function sanitizeAndParseTextToHtml(
    text: string | undefined,
    t: I18nType['t'],
    {
        mentions,
        highlights,
        shouldLinkMentions = true,
        shouldParseMarkup = false,
        shouldParseLinks = false,
        truncate: truncateMax,
    }: SanitizeAndParseTextToHtmlOptions,
): SanitizedHtml {
    if (text === undefined || text === '') {
        return '' as SanitizedHtml;
    }

    let sanitizedText = escapeHtmlUnsafeChars(text);

    if (truncateMax !== undefined) {
        if (highlights !== undefined) {
            sanitizedText = truncate(
                sanitizedText,
                truncateMax,
                'around',
                highlights instanceof Array ? highlights : [highlights],
                'end',
            ) as SanitizedHtml;
        } else {
            sanitizedText = truncate(sanitizedText, truncateMax, 'end') as SanitizedHtml;
        }
    }

    if (shouldParseMarkup) {
        sanitizedText = parseMarkup(sanitizedText);
    }

    if (mentions !== undefined) {
        sanitizedText = parseMentions(t, sanitizedText, mentions, shouldLinkMentions);
    }

    if (highlights !== undefined) {
        sanitizedText = parseHighlights(sanitizedText, highlights);
    }

    if (shouldParseLinks) {
        sanitizedText = parseLinks(sanitizedText);
    }

    return sanitizedText;
}

/**
 * Escape HTML-unsafe characters in the given input string. If the input is
 * undefined an empty string is returned.
 *
 * @param text string | undefined
 * @returns escaped string
 */
function escapeHtmlUnsafeChars(text: string | undefined): SanitizedHtml {
    if (text === undefined || text === '') {
        return '' as SanitizedHtml;
    }

    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;') as SanitizedHtml;
}

/**
 * Returns an HTML tag (as a string) that can be used to render a {@link Mention}.
 *
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param mention The mention to generate HTML code for.
 * @param enableLinks Whether to format mentions of contacts as links.
 * @returns A string containing a HTML tag which represents the supplied `Mention`.
 */
function getMentionHtml(
    t: I18nType['t'],
    mention: AnyMention,
    enableLinks: boolean,
): SanitizedHtml {
    switch (mention.type) {
        case 'self': {
            const text = escapeHtmlUnsafeChars(
                mention.name ?? t('messaging.label--mention-me', 'Me'),
            );
            return `<span class="mention me">@${text}</span>` as SanitizedHtml;
        }
        case 'contact': {
            const name = escapeHtmlUnsafeChars(mention.name);
            if (enableLinks) {
                const href = `#/conversation/${mention.lookup.type}/${mention.lookup.uid}/`;
                return `<a href="${href}" draggable="false" class="mention">@${name}</a>` as SanitizedHtml;
            }
            return `<span class="mention">@${name}</span>` as SanitizedHtml;
        }
        case 'everyone': {
            const text = escapeHtmlUnsafeChars(t('messaging.label--mention-all', 'All'));
            return `<span class="mention all">@${text}</span>` as SanitizedHtml;
        }
        default:
            return unreachable(mention);
    }
}

function getHighlightHtml(highlight: SanitizedHtml): SanitizedHtml {
    return `<span class="parsed-text-highlight">${highlight}</span>` as SanitizedHtml;
}

/**
 * Parses some text and replaces predefined markup indicators with HTML tags:
 * - `*some words*` to `<span class="md-bold">some words</span>`.
 * - `_some words_` to `<span class="md-italic">some words</span>`.
 * - `~some words~` to `<span class="md-strike">some words</span>`.
 *
 * @param text The text to parse.
 * @returns The text containing the markup replaced with HTML.
 */
function parseMarkup(text: SanitizedHtml): SanitizedHtml {
    return markify(text, {
        [TokenType.Asterisk]: 'md-bold',
        [TokenType.Underscore]: 'md-italic',
        [TokenType.Tilde]: 'md-strike',
    }) as SanitizedHtml;
}

/**
 * Parses some text and replaces `@[<IdentityString>]` mentions with HTML tags. The
 * replacement will be `@All` or `@<mention.name>`, wrapped in an appropriate tag:
 *
 * - `span` for mentions of type "all" or "self".
 * - `a` for mentions of type "other" (linking to the corresponding conversation).
 *
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param text The text to parse.
 * @param mentions One or more mentions to search for and replace in the text.
 * @param enableLinks Whether to format mentions of contacts as links.
 * @returns The text containing the mentions replaced with HTML.
 */
export function parseMentions(
    t: I18nType['t'],
    text: SanitizedHtml,
    mentions: AnyMention | AnyMention[],
    enableLinks: boolean,
): SanitizedHtml {
    let parsedText = text;
    for (const mention of mentions instanceof Array ? mentions : [mentions]) {
        parsedText = parsedText.replaceAll(
            `@[${mention.identity}]`,
            getMentionHtml(t, mention, enableLinks),
        ) as SanitizedHtml;
    }

    return parsedText;
}

/**
 * Parses some text and replaces highlights (e.g. from search) with HTML tags.
 *
 * @param text The text to parse.
 * @param highlights An array of highlights to search for and replace in the text.
 * @returns The text containing the highlights replaced with HTML.
 */
export function parseHighlights(text: SanitizedHtml, highlights: string | string[]): SanitizedHtml {
    let parsedText = text;
    const highlightsArray = highlights instanceof Array ? highlights : [highlights];
    for (const highlight of highlightsArray) {
        if (highlight.trim() !== '') {
            parsedText = parsedText
                // Split text at the locations where it matches the highlight string.
                .split(new RegExp(`(${escapeRegExp(highlight)})`, 'ui'))
                // Replace chunks to highlight with HTML.
                .map((chunk, index) =>
                    index % 2 === 0 ? chunk : getHighlightHtml(chunk as SanitizedHtml),
                )
                .join('') as SanitizedHtml;
        }
    }

    return parsedText;
}

/**
 * Parses some text and replaces urls with acutal `a` tags.
 *
 * @param text The text to parse.
 * @returns The text containing the urls replaced with HTML.
 */
export function parseLinks(text: SanitizedHtml): SanitizedHtml {
    return autolinker.link(text, {
        phone: false,
        stripPrefix: false,
        stripTrailingSlash: false,
        urls: {
            ipV4Matches: false,
        },
        replaceFn: (match) => {
            // Autolinker sometimes matches text starting with a double-slash (e.g. "//threema.ch"),
            // which shouldn't be permitted.
            if (match.type === 'url' && match.getMatchedText().startsWith('//')) {
                return false;
            }

            if (match.type === 'url' && match.getUrlMatchType() === 'tld') {
                // If no scheme was given use `https://` instead of `http://`
                // See https://github.com/gregjacobs/Autolinker.js/issues/319
                return match
                    .buildTag()
                    .setAttr('href', match.getUrl().replace('http://', 'https://'));
            }
            return true;
        },
    }) as SanitizedHtml;
}
