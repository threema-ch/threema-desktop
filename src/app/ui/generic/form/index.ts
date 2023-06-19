import {markify, TokenType} from '@threema/threema-markup';
import autolinker from 'autolinker';

import {MessageDirection} from '~/common/enum';
import {type Conversation, type RemoteModelFor} from '~/common/model';
import {type Mutable, type u53} from '~/common/types';
import {type Remote} from '~/common/utils/endpoint';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import {escapeRegExp} from '~/common/utils/regex';
import {type IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type ConversationMessage} from '~/common/viewmodel/conversation-message';
import {type ConversationMessageSetStore} from '~/common/viewmodel/conversation-message-set';
import {type Mention} from '~/common/viewmodel/utils/mentions';

/**
 * A function that takes a (possibly undefined) string and returns a processed
 * string. If the input is undefined an empty string must be returned.
 */
export type TextProcessor = (text: string | undefined) => string;

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
export type SortedMessageList = Remote<ConversationMessage>[];
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
 * TODO(DESK-536): Temporary solution, which will get replaced after DESK-536 is implemented
 * @param date Date
 * @returns string ISO formatted DateTime
 */
export function getDateTimeIsoString(date: Date): string {
    function padStart(number: u53): string {
        return number.toString().padStart(2, '0');
    }

    const year = date.getFullYear();
    const month = padStart(date.getMonth() + 1);
    const day = padStart(date.getDate());
    const hour = padStart(date.getHours());
    const minute = padStart(date.getMinutes());

    return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * TODO(DESK-536): Temporary solution, which will get replaced after DESK-536 is implemented
 * @param date Date
 * @returns string ISO formatted Time
 */
export function getTimeIsoString(date: Date): string {
    return getDateTimeIsoString(date).split(' ')[1];
}

/**
 * Returns an HTML tag (as a string) that can be used to render a {@link Mention}.
 *
 * @param mention The mention to generate HTML code for.
 * @returns A string containing a HTML tag which represents the supplied `Mention`.
 */
export function getMentionHtml(mention: Mention): string {
    if (mention.type === 'all') {
        return `<span class="mention all">@All</span>`;
    }

    const mentionDisplay = `@${escapeHtmlUnsafeChars(mention.name)}`;

    if (mention.type === 'self') {
        return `<span class="mention me">${mentionDisplay}</span>`;
    }

    const href = `#/conversation/${mention.lookup.type}/${mention.lookup.uid}/`;
    return `<a href="${href}" draggable="false" class="mention">${mentionDisplay}</a>`;
}

export function getHighlightHtml(highlight: string): string {
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
function parseMarkup(text: string): string {
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
 * @param text The text to parse.
 * @param mentions An array of mentions to search for and replace in the text.
 * @returns The text containing the mentions replaced with HTML.
 */
function parseMentions(text: string, mentions: Mention | Mention[]): string {
    let parsedText = text;
    for (const mention of mentions instanceof Array ? mentions : [mentions]) {
        parsedText = parsedText.replaceAll(`@[${mention.identityString}]`, getMentionHtml(mention));
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
function parseHighlights(text: string, highlights: string | string[]): string {
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
function parseLinks(text: string): string {
    return autolinker.link(text, {
        phone: false,
        stripPrefix: false,
        stripTrailingSlash: false,
        urls: {
            ipV4Matches: false,
        },
        replaceFn: (match) => {
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

/**
 * Parses some text and replaces various tokens with HTML. This is useful to render messages and
 * message previews with formatting.
 *
 * Warning: If you render the output in a web UI, you must absolutely make sure that the input
 *          `text` is sanitized (e.g. with {@link escapeHtmlUnsafeChars})!
 *
 * @param text The text to parse.
 * @param mentions The {@link Mention}s to search for and replace in the text.
 * @param highlights The highlights to search for and replace in the text.
 * @param shouldParseMarkup If simple markup tokens (bold, italic, strikethrough) should be
 * replaced.
 * @param shouldParseLinks If links should be detected and replaced.
 * @returns The text containing the specified tokens replaced with HTML.
 */
export function parseText(
    text: string | undefined,
    mentions?: Mention | Mention[],
    highlights?: string | string[],
    shouldParseMarkup = false,
    shouldParseLinks = false,
): string {
    if (text === undefined || text === '') {
        return '';
    }

    if (shouldParseMarkup) {
        text = parseMarkup(text);
    }

    if (mentions !== undefined) {
        text = parseMentions(text, mentions);
    }

    if (highlights !== undefined) {
        text = parseHighlights(text, highlights);
    }

    if (shouldParseLinks) {
        text = parseLinks(text);
    }

    return text;
}
