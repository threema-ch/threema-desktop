import type {I18nType} from '~/app/ui/i18n-types';
import {type SanitizedHtml, sanitizeAndParseTextToHtml} from '~/app/ui/utils/text';
import type {u53} from '~/common/types';
import type {AnyMention} from '~/common/viewmodel/utils/mentions';

/**
 * Sanitizes and parses raw text from a text message to HTML.
 */
export function getTextContent(
    raw: string | undefined,
    highlights: string | string[] | undefined,
    mentions: AnyMention | AnyMention[] | undefined,
    t: I18nType['t'],
    truncate?: u53,
): SanitizedHtml | undefined {
    const html = sanitizeAndParseTextToHtml(raw, t, {
        highlights,
        mentions,
        shouldLinkMentions: false,
        shouldParseLinks: false,
        shouldParseMarkup: true,
        truncate,
    });

    return html === '' ? undefined : html;
}
