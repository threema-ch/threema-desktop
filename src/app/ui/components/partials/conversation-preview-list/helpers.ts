import type {Status} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {ConversationPreviewListItemProps} from '~/app/ui/components/partials/conversation-preview-list/props';
import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardBottomLeftItemOptions(
    i18n: I18nType,
    isArchived: boolean,
    lastMessage: ConversationPreviewListItemProps['lastMessage'],
    receiver: AnyReceiverData,
): AnyContentItemOptions[] | undefined {
    const lastMessageItem =
        lastMessage === undefined
            ? []
            : [
                  {
                      type: 'text',
                      text: getLastMessagePreviewText(i18n, receiver, lastMessage),
                  } as const,
              ];

    switch (receiver.type) {
        case 'contact': {
            const {isInactive, isInvalid} = receiver;

            if (!isInactive && !isInvalid && lastMessageItem.length === 0) {
                return undefined;
            }

            return [
                ...(!isArchived && !isInactive && !isInvalid
                    ? []
                    : [
                          {
                              type: 'tags',
                              isArchived,
                              isInactive,
                              isInvalid,
                          } as const,
                      ]),
                ...lastMessageItem,
            ];
        }

        case 'group': {
            if (!isArchived && lastMessageItem.length === 0) {
                return undefined;
            }

            return [
                ...(!isArchived
                    ? []
                    : [
                          {
                              type: 'tags',
                              isArchived,
                          } as const,
                      ]),
                ...lastMessageItem,
            ];
        }

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            return undefined;

        default:
            return unreachable(receiver);
    }
}

function getLastMessagePreviewText(
    i18n: I18nType,
    receiver: Pick<AnyReceiverData, 'type'>,
    lastMessage: Pick<
        NonNullable<ConversationPreviewListItemProps['lastMessage']>,
        'file' | 'sender' | 'text'
    >,
): string {
    let text: string | undefined = undefined;
    if (lastMessage.text !== undefined) {
        text = lastMessage.text.raw;
    } else if (lastMessage.file !== undefined) {
        switch (lastMessage.file.type) {
            case 'audio':
                text = i18n.t('messaging.label--default-audio-message-preview', 'Voice Message');
                break;

            case 'file':
                text = i18n.t('messaging.label--default-file-message-preview', 'File');
                break;

            case 'image':
                text = i18n.t('messaging.label--default-image-message-preview', 'Image');
                break;

            case 'video':
                text = i18n.t('messaging.label--default-video-message-preview', 'Video');
                break;

            default:
                unreachable(lastMessage.file.type);
        }
    }

    if (receiver.type === 'group' && text !== undefined) {
        switch (lastMessage.sender?.type) {
            case 'self':
                return i18n.t('messaging.label--default-sender-self', 'Me: {text}', {
                    text,
                });

            case 'contact':
                return `${lastMessage.sender.name}: ${text}`;

            case undefined:
                break;

            default:
                unreachable(lastMessage.sender);
        }
    }

    return text ?? '';
}

/**
 * Return the corresponding date for the given message status.
 */
export function getMessageDateByStatus(status: Status): Date {
    if (status.read !== undefined) {
        return status.read.at;
    } else if (status.delivered !== undefined) {
        return status.delivered.at;
    } else if (status.sent !== undefined) {
        return status.sent.at;
    }

    return status.created.at;
}
