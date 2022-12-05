import {type Logger} from '~/common/logging';
import {type MessageId, ensureMessageId} from '~/common/network/types';
import {ensureError} from '~/common/utils/assert';
import {hexLeToU64, u64ToHexLe} from '~/common/utils/number';

const REGEX_MATCH_QUOTES = /^> quote #(?<messageId>[0-9a-f]{16})(?:\r?\n){2}(?<comment>.*)$/su;

/**
 * Parse text from Textmessage for possible quoted message id
 * @returns quoted messageid and comment, or undefined if text is not a quote
 */
export function parsePossibleTextQuote(
    text: string,
    log: Logger,
    messageId: MessageId,
): {readonly quotedMessageId: MessageId; readonly comment: string} | undefined {
    // Parse quote out of possible quote message text
    const match = text.match(REGEX_MATCH_QUOTES)?.groups;
    if (match === undefined) {
        return undefined;
    }
    let quotedMessageId: MessageId;
    let comment: string;
    try {
        quotedMessageId = ensureMessageId(hexLeToU64(match.messageId));
        comment = `${match.comment}`;
    } catch (e) {
        log.warn(
            `Message ${u64ToHexLe(messageId)} contains an invalid quote string: ${
                ensureError(e).message
            }`,
        );
        return undefined;
    }

    // Validate that the quoted message is not a self reference
    if (quotedMessageId === messageId) {
        log.warn(`Message with id ${u64ToHexLe(messageId)} quoted itself`);
        return undefined;
    }

    return {
        comment,
        quotedMessageId,
    };
}
