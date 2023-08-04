import {MessageDirection, ReceiverType} from '~/common/enum';
import {unreachable} from '~/common/utils/assert';
import {
    type AnyMessageBody,
    type IncomingMessage,
    type Message,
    type MessageStatus,
} from '~/common/viewmodel/types';

/**
 * Context menu selection events which may be dispatched by the message context menu.
 */
export type ConversationMessageContextMenuEvent =
    | 'thumbup'
    | 'thumbdown'
    | 'quote'
    | 'forward'
    | 'copy'
    | 'copyLink'
    | 'copyImage'
    | 'save'
    | 'showMessageDetails'
    | 'delete';

/**
 * Returns whether a message is inbound, and narrows the type accordingly.
 */
export function isIncoming(
    message: Message<AnyMessageBody>,
): message is IncomingMessage<AnyMessageBody> {
    return message.direction === MessageDirection.INBOUND;
}

/**
 * Returns whether a conversation is in a multi-user setting (as opposed to a 1:1 conversation).
 */
export function isMultiUserConversation(receiverType: ReceiverType): boolean {
    switch (receiverType) {
        case ReceiverType.GROUP:
        case ReceiverType.DISTRIBUTION_LIST:
            return true;

        case ReceiverType.CONTACT:
            return false;

        default:
            return unreachable(receiverType);
    }
}

/**
 * Extracts the main text content from a message. Note: This can vary by message type (e.g. an image
 * message's text content is the caption). Note: Will not traverse the content of quotes, which
 * means only the text of the quote itself will be extracted.
 */
export function extractTextContent(message: Message<AnyMessageBody>): string | undefined {
    switch (message.type) {
        case 'text':
        case 'quote':
            return message.body.text === '' ? undefined : message.body.text;

        case 'audio':
        case 'file':
        case 'image':
        case 'video':
            return message.body.caption;

        case 'location':
            return message.body.description;

        default:
            return unreachable(message);
    }
}

/**
 * Extracts the {@link MessageStatus} of an (outbound) message.
 */
export function extractMessageStatus(message: Message<AnyMessageBody>): MessageStatus | undefined {
    if (message.state.type === 'failed') {
        return 'error';
    }

    if (message.direction === MessageDirection.OUTBOUND) {
        return message.status;
    }

    return undefined;
}
