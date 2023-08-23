import {i18n} from '~/app/ui/i18n';
import {toast} from '~/app/ui/snackbar';
import {convertImage} from '~/common/dom/utils/image';
import {MessageDirection, ReceiverType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type ReadonlyUint8Array} from '~/common/types';
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

/**
 * Copy image bytes to the system clipboard.
 */
export async function copyImageBytes(
    bytesOrFunction: ReadonlyUint8Array | (() => Promise<ReadonlyUint8Array>),
    mediaType: string,
    log: Logger,
): Promise<void> {
    log.debug('Copying image content');
    try {
        const bytes =
            typeof bytesOrFunction === 'function' ? await bytesOrFunction() : bytesOrFunction;
        let blob = new Blob([bytes], {type: mediaType});
        if (mediaType !== 'image/png') {
            // Convert other image subtypes to png for clipboard compatibility.
            blob = await convertImage(blob, 'image/png');
        }

        await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);

        toast.addSimpleSuccess(
            i18n.get().t('messaging.success--copy-message-image', 'Image copied to clipboard'),
        );
        log.debug('Image successfully copied to clipboard');
    } catch (error) {
        log.error('Could not copy image to clipboard:', error);
        toast.addSimpleFailure(
            i18n
                .get()
                .t('messaging.error--copy-message-image', 'Could not copy image to clipboard'),
        );
    }
}
