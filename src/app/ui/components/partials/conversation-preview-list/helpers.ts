import type {Status} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {Draft} from '~/app/ui/components/partials/conversation/drafts';
import type {ConversationPreviewProps} from '~/app/ui/components/partials/conversation-preview-list/internal/conversation-preview/props';
import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {type SanitizedHtml, sanitizeAndParseTextToHtml} from '~/app/ui/utils/text';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardBottomLeftItemOptions(
    draft: Draft | undefined,
    i18n: I18nType,
    isArchived: boolean,
    isPrivate: boolean,
    lastMessage: ConversationPreviewProps['lastMessage'],
    receiver: AnyReceiverData,
): AnyContentItemOptions[] | undefined {
    // Hide last message text if the conversation is private.
    if (isPrivate) {
        return [
            {
                type: 'text',
                text: {
                    raw: i18n.t('messaging.label--protected-conversation', 'Private'),
                },
            },
        ];
    }

    // Prefer draft.
    if (draft !== undefined) {
        return [
            {
                type: 'text',
                text: {
                    html: `<span class="draft">${i18n.t('messaging.label--prefix-draft', 'Draft:')}</span> ${draft.text}` as SanitizedHtml,
                },
            },
        ];
    }

    const lastMessageItem =
        lastMessage === undefined
            ? []
            : [
                  {
                      type: 'text',
                      text: {
                          html: getLastMessagePreviewText(i18n, receiver, lastMessage),
                      },
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
        NonNullable<ConversationPreviewProps['lastMessage']>,
        'file' | 'sender' | 'text' | 'type'
    >,
): SanitizedHtml {
    let text: SanitizedHtml | undefined = undefined;

    if (lastMessage.type === 'deleted') {
        return i18n.t(
            'messaging.label--deleted-message-preview',
            'This message was deleted',
        ) as SanitizedHtml;
    }
    if (lastMessage.text !== undefined) {
        text = sanitizeAndParseTextToHtml(lastMessage.text.raw, i18n.t, {
            mentions: lastMessage.text.mentions,
            shouldLinkMentions: false,
            shouldParseLinks: false,
            shouldParseMarkup: true,
        });
    } else if (lastMessage.file !== undefined) {
        switch (lastMessage.file.type) {
            case 'audio':
                text = i18n.t(
                    'messaging.label--default-audio-message-preview',
                    'Voice Message',
                ) as SanitizedHtml;
                break;

            case 'file':
                text = i18n.t(
                    'messaging.label--default-file-message-preview',
                    'File',
                ) as SanitizedHtml;
                break;

            case 'image':
                text = i18n.t(
                    'messaging.label--default-image-message-preview',
                    'Image',
                ) as SanitizedHtml;
                break;

            case 'video':
                text = i18n.t(
                    'messaging.label--default-video-message-preview',
                    'Video',
                ) as SanitizedHtml;
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
                }) as SanitizedHtml;

            case 'contact':
                return `${lastMessage.sender.name}: ${text}` as SanitizedHtml;

            case undefined:
                break;

            default:
                unreachable(lastMessage.sender);
        }
    }

    return text ?? ('' as SanitizedHtml);
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
