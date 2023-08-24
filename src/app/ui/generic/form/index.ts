import {markify, TokenType} from '@threema/threema-markup';
import autolinker from 'autolinker';

import {type I18nType} from '~/app/ui/i18n-types';
import {MessageDirection} from '~/common/enum';
import {type Conversation, type RemoteModelFor} from '~/common/model';
import {type Mutable, type u53} from '~/common/types';
import {type Remote} from '~/common/utils/endpoint';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import {escapeRegExp} from '~/common/utils/regex';
import {type IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation-message';
import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';
import {type Mention} from '~/common/viewmodel/utils/mentions';

/**
 * Escape HTML-unsafe characters in the given input string. If the input is
 * undefined an empty string is returned.
 *
 * @param text string | undefined
 * @returns escaped string
 */
export function escapeHtmlUnsafeChars(text: string | undefined): string {
    if (text === undefined || text === '') {
        return '';
    }

    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

/**
 * A list of messages sorted from oldest to newest.
 */
export type SortedMessageList = Remote<ConversationMessageViewModelBundle>[];
/**
 * A store containing a {@link SortedMessageList}.
 */
export type SortedMessageListStore = IQueryableStore<SortedMessageList>;

/**
 * Check whether the message referenced by the index has a different direction than the previous
 * message.
 */
export function hasDirectionChanged(messages: SortedMessageList, index: u53): boolean {
    if (index === 0) {
        return false;
    }

    const lastMessageDirection = messages[index - 1].direction;
    const currentMessageDirection = messages[index].direction;

    return lastMessageDirection !== currentMessageDirection;
}

/**
 * Precalculated information about the unread messages. See doc for each property.
 */
export interface UnreadMessageInfo {
    /**
     * Only true when no unread info has been yet calculated for a given conversation. Given how
     * {@link UnreadMessageInfo} is used, this attribute is easier to use than checking for an
     * undefined object.
     */
    readonly isUnset: boolean;

    /**
     * Index of the earliest unread message, above which a separator will be displayed.
     * Undefined if no message is unread.
     */
    readonly earliestUnreadMessageIndex?: u53;

    /**
     * Instead of iterating over the whole message list, we cache the last message that we checked
     * so that we don't need to re-check messages that have already been checked.
     */
    readonly latestCheckedMessageIndex: u53;

    /**
     * Number of unread inbound messages after `earliestUnreadMessageIndex`.
     */
    readonly inboundUnreadMessageCount: u53;

    /**
     * Indicates whether any outbound messages have been written after the message at index
     * `earliestUnreadMessageIndex` so that we can adapt the UI accordingly.
     */
    readonly hasOutboundMessageAfterEarliestUnreadMessage: boolean;

    /**
     * This property is mutable because the caller of the {@link UnreadMessageInfo} object can set it
     * to `true` to force a recount of the unread messages the next time it is calculated.
     */
    isRecountPending: boolean;
}

export function getUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
    currentUnreadMessageInfo: UnreadMessageInfo,
): UnreadMessageInfo {
    if (
        currentUnreadMessageInfo.isUnset ||
        currentUnreadMessageInfo.earliestUnreadMessageIndex === undefined ||
        currentUnreadMessageInfo.isRecountPending
    ) {
        return newUnreadMessageInfo(conversation, messages);
    }

    return updateUnreadMessageInfo(messages, {
        ...currentUnreadMessageInfo,
        // Type narrowing does not work properly here.
        earliestUnreadMessageIndex: currentUnreadMessageInfo.earliestUnreadMessageIndex,
    });
}

export const unsetUnreadMessageInfo: UnreadMessageInfo = {
    isUnset: true,
    earliestUnreadMessageIndex: undefined,
    latestCheckedMessageIndex: -1,
    inboundUnreadMessageCount: 0,
    hasOutboundMessageAfterEarliestUnreadMessage: false,
    isRecountPending: false,
};

function newUnreadMessageInfo(
    conversation: RemoteModelFor<Conversation>,
    messages: SortedMessageList,
): UnreadMessageInfo {
    const info: Mutable<UnreadMessageInfo> = {
        ...unsetUnreadMessageInfo,
        isUnset: false,
        latestCheckedMessageIndex: messages.length - 1,
    };

    // Optimization: No need to scan for unread messages if there aren't any
    if (conversation.view.unreadMessageCount < 1) {
        return info;
    }

    // Search for unread messages, starting at the newest message. From there, we search backwards
    // until we find the first message that's either outbound, or that has already been read.
    for (let index = messages.length - 1; index >= 0; index--) {
        const msgView = messages[index].messageStore.get().view;

        if (msgView.direction === MessageDirection.INBOUND && msgView.readAt === undefined) {
            info.earliestUnreadMessageIndex = index;
            info.inboundUnreadMessageCount++;
        } else {
            break;
        }
    }

    return info;
}

function updateUnreadMessageInfo(
    messages: SortedMessageList,
    info: Required<UnreadMessageInfo>,
): UnreadMessageInfo {
    const updatedInfo: Mutable<UnreadMessageInfo> = {
        ...info,
        latestCheckedMessageIndex: messages.length - 1,
    };

    for (let index = messages.length - 1; index > info.latestCheckedMessageIndex; index--) {
        const msgView = messages[index].messageStore.get().view;

        if (msgView.direction === MessageDirection.INBOUND) {
            updatedInfo.inboundUnreadMessageCount++;
        } else {
            updatedInfo.hasOutboundMessageAfterEarliestUnreadMessage = true;
        }
    }

    return updatedInfo;
}

export function isLastMessageOutbound(messageList: SortedMessageList): boolean {
    const lastMessage = messageList.at(-1);
    return lastMessage?.direction === MessageDirection.OUTBOUND;
}

export function isLastOutboundMessageOlderThan(
    messageList: SortedMessageList,
    thresholdAgeInMillis: u53,
): boolean {
    for (let index = messageList.length - 1; index >= 0; index--) {
        const messageStore = messageList[index].messageStore;

        if (messageStore.ctx === MessageDirection.OUTBOUND) {
            const lastOutboundMessageCreatedAt = messageStore.get().view.createdAt;
            const lastOutboundMessageAgeMillis =
                dateToUnixTimestampMs(new Date()) -
                dateToUnixTimestampMs(lastOutboundMessageCreatedAt);

            return lastOutboundMessageAgeMillis > thresholdAgeInMillis;
        }

        if (messageStore.get().view.readAt === undefined) {
            continue;
        }
    }

    // We reached the most recent read inbound message so we can stop the loop and return true.
    return true;
}

/**
 * Derive a sorted list of messages from a set of messages.
 */
export function sortMessages(
    setStore: Remote<ConversationMessageSetStore>,
): SortedMessageListStore {
    return derive(setStore, (conversationMessageSet, getAndSubscribe) =>
        [...conversationMessageSet].sort(
            (a, b) => getAndSubscribe(a.viewModel).ordinal - getAndSubscribe(b.viewModel).ordinal,
        ),
    );
}

/**
 * Returns an HTML tag (as a string) that can be used to render a {@link Mention}.
 *
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param mention The mention to generate HTML code for.
 * @param enableLinks Whether to format mentions of contacts as links.
 * @returns A string containing a HTML tag which represents the supplied `Mention`.
 */
function getMentionHtml(t: I18nType['t'], mention: Mention, enableLinks: boolean): string {
    if (mention.type === 'all') {
        const text = t('messaging.label--mention-all', 'All');

        return `<span class="mention all">@${text}</span>`;
    }

    const mentionDisplay = escapeHtmlUnsafeChars(mention.name);
    if (mention.type === 'self') {
        const text =
            mentionDisplay === mention.identityString
                ? t('messaging.label--mention-me', 'Me')
                : mentionDisplay;

        return `<span class="mention me">@${text}</span>`;
    }

    if (enableLinks) {
        const href = `#/conversation/${mention.lookup.type}/${mention.lookup.uid}/`;
        return `<a href="${href}" draggable="false" class="mention">@${mentionDisplay}</a>`;
    }

    return `<span class="mention">@${mentionDisplay}</span>`;
}

function getHighlightHtml(highlight: string): string {
    return `<span class="parsed-text-highlight">${highlight}</span>`;
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
export function parseMarkup(text: string): string {
    return markify(text, {
        [TokenType.Asterisk]: 'md-bold',
        [TokenType.Underscore]: 'md-italic',
        [TokenType.Tilde]: 'md-strike',
    });
}

/**
 * Parses some text and replaces `@[<IdentityString>]` {@link Mention}s with HTML tags. The
 * replacement will be `@All` or `@<mention.name>`, wrapped in an appropriate tag:
 * - `span` for mentions of type "all" or "self".
 * - `a` for mentions of type "other" (linking to the corresponding conversation).
 *
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param text The text to parse.
 * @param mentions An array of mentions to search for and replace in the text.
 * @param enableLinks Whether to format mentions of contacts as links.
 * @returns The text containing the mentions replaced with HTML.
 */
export function parseMentions(
    t: I18nType['t'],
    text: string,
    mentions: Mention | Mention[],
    enableLinks: boolean,
): string {
    let parsedText = text;
    for (const mention of mentions instanceof Array ? mentions : [mentions]) {
        parsedText = parsedText.replaceAll(
            `@[${mention.identityString}]`,
            getMentionHtml(t, mention, enableLinks),
        );
    }

    return parsedText;
}

/**
 * Parses some text and replaces highlights with HTML tags.
 *
 * @param text The text to parse.
 * @param highlights An array of highlights to search for and replace in the text.
 * @returns The text containing the highlights replaced with HTML.
 */
export function parseHighlights(text: string, highlights: string | string[]): string {
    let parsedText = text;
    for (const highlight of highlights instanceof Array ? highlights : [highlights]) {
        if (highlight.trim() !== '') {
            parsedText = parsedText
                // Split text at the locations where it matches the highlight string.
                .split(new RegExp(`(${escapeRegExp(highlight)})`, 'ui'))
                // Replace chunks to highlight with HTML.
                .map((chunk, index) => (index % 2 === 0 ? chunk : getHighlightHtml(chunk)))
                .join('');
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
export function parseLinks(text: string): string {
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
    });
}

export interface ParseTextParams {
    /** The text to parse. */
    readonly text: string | undefined;
    /** The {@link Mention}s to search for and replace in the text. */
    readonly mentions?: Mention | Mention[];
    /** The highlights to search for and replace in the text. */
    readonly highlights?: string | string[];
    /** If mentions should link to the conversation with the respective contact. */
    readonly shouldLinkMentions?: boolean;
    /** If simple markup tokens (bold, italic, strikethrough) should be replaced. */
    readonly shouldParseMarkup?: boolean;
    /** If links should be detected and replaced. */
    readonly shouldParseLinks?: boolean;
}

/**
 * Parses some text and replaces various tokens with HTML. This is useful to render messages and
 * message previews with formatting.
 *
 * Warning: If you render the output in a web UI, you must absolutely make sure that the input
 *          `text` is sanitized (e.g. with {@link escapeHtmlUnsafeChars})!
 *
 * @param t The function to use for translating labels of special mentions, such as "@All".
 * @param params See {@link ParseTextParams} for docs
 * @returns The text containing the specified tokens replaced with HTML.
 */
export function parseText(
    t: I18nType['t'],
    {
        text,
        mentions,
        highlights,
        shouldLinkMentions = true,
        shouldParseMarkup = false,
        shouldParseLinks = false,
    }: ParseTextParams,
): string {
    if (text === undefined || text === '') {
        return '';
    }

    if (shouldParseMarkup) {
        text = parseMarkup(text);
    }

    if (mentions !== undefined) {
        text = parseMentions(t, text, mentions, shouldLinkMentions);
    }

    if (highlights !== undefined) {
        text = parseHighlights(text, highlights);
    }

    if (shouldParseLinks) {
        text = parseLinks(text);
    }

    return text;
}

/**
 * Determine whether `a` and `b` {@link Date}s are on the same day.
 */
function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/**
 * Determine whether `a` and `b` {@link Date}s are in the same year.
 */
function isSameYear(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear();
}

/**
 * Determine whether the given {@link Date} lies within the last week (including today).
 */
function isWithinLastWeek(date: Date): boolean {
    const tomorrowLastWeek = new Date();
    tomorrowLastWeek.setDate(tomorrowLastWeek.getDate() - 6);
    tomorrowLastWeek.setHours(0, 0, 0, 0);

    return date <= new Date() && date > tomorrowLastWeek;
}

/**
 * Determine whether the given {@link Date} lies in the current year.
 */
function isWithinCurrentYear(date: Date): boolean {
    return isSameYear(date, new Date());
}

/**
 * Determine whether the given {@link Date} is today.
 */
function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
}

/**
 * Determine whether the given {@link Date} is yesterday.
 */
function isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDay(date, yesterday);
}

/**
 * Format a date as a "fluent", localized string.
 *
 * @param date Date to format.
 * @param i18n Translation provider.
 * @returns Formatted date.
 */
export function formatDateLocalized(date: Date, i18n: I18nType): string {
    const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
    };

    if (isToday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "1:44 PM"
        // Example DE: "13:44"
        return formatter.format(date);
    }

    if (isYesterday(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, timeOptions);

        // Example EN: "Yesterday 1:44 PM"
        // Example DE: "Gestern, 13:44"
        return i18n.t('messaging.label--timestamp-yesterday', 'Yesterday {time}', {
            time: formatter.format(date),
        });
    }

    if (isWithinLastWeek(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            weekday: 'long',
            ...timeOptions,
        });

        // Example EN: "Monday 1:44 PM"
        // Example DE: "Montag, 13:44"
        return formatter.format(date);
    }

    if (isWithinCurrentYear(date)) {
        const formatter = new Intl.DateTimeFormat(i18n.locale, {
            month: 'short',
            day: 'numeric',
            ...timeOptions,
        });

        // Example EN: "Jul 7, 1:44 PM"
        // Example DE: "7. Jul 13:44"
        return formatter.format(date);
    }

    const formatter = new Intl.DateTimeFormat(i18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...timeOptions,
    });

    // Example EN: "Jul 7, 2023, 1:44 PM"
    // Example DE: "7. Jul 2023, 13:44"
    return formatter.format(date);
}
