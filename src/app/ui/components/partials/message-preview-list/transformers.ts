import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import {getTextContent} from '~/app/ui/components/partials/message-preview-list/helpers';
import type {MessagePreviewListProps} from '~/app/ui/components/partials/message-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {DbReceiverLookup} from '~/common/db';
import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {Remote} from '~/common/utils/endpoint';
import {localeSort} from '~/common/utils/string';
import type {ConversationMessageViewModelBundle} from '~/common/viewmodel/conversation/main/message';

/**
 * Returns the message's reactions props in the shape expected by {@link MessageProps}.
 */
export function transformMessageReactionsProps(
    viewModel: ReturnType<Remote<ConversationMessageViewModelBundle>['viewModelStore']['get']>,
    i18n: I18nType,
): MessageProps['reactions'] {
    return viewModel.reactions
        .map((reaction) => ({
            ...reaction,
            sender: {
                name:
                    reaction.sender.type === 'self'
                        ? i18n.t('contacts.label--own-name', 'Me')
                        : reaction.sender.name,
            },
        }))
        .sort((a, b) => localeSort(a.sender.name, b.sender.name));
}

/**
 * Returns the message's quote props in the shape expected by {@link MessageProps}.
 */
export function transformMessageQuoteProps(
    rawQuoteProps: MessagePreviewListProps['items'][u53]['messages'][u53]['quote'],
    receiverLookup: DbReceiverLookup,
    services: Pick<AppServices, 'blobCache'>,
    i18n: I18nType,
    log: Logger,
): MessageProps['quote'] {
    if (rawQuoteProps === undefined) {
        return undefined;
    }
    if (rawQuoteProps === 'not-found') {
        return {
            type: 'not-found',
            fallbackText: i18n.t(
                'messaging.error--quoted-message-not-found',
                'The quoted message could not be found',
            ),
        };
    } else if (rawQuoteProps === 'deleted') {
        return {
            type: 'deleted',
            fallbackText: i18n.t(
                'messaging.error--quoted-message-deleted',
                'The quoted message was deleted',
            ),
        };
    }

    const sanitizedHtml = getTextContent(
        rawQuoteProps.text?.raw,
        undefined,
        rawQuoteProps.text?.mentions,
        i18n.t,
        70,
    );

    return {
        type: 'default',
        alt: i18n.t('messaging.hint--media-thumbnail', 'Media preview'),
        content:
            sanitizedHtml === undefined
                ? undefined
                : {
                      sanitizedHtml,
                  },
        clickable: false,
        file: transformMessageFileProps(
            rawQuoteProps.file,
            rawQuoteProps.id,
            receiverLookup,
            services,
            rawQuoteProps.text?.raw.length,
        ),
        onError: (error) =>
            log.error(
                `An error occurred in a child component: ${extractErrorMessage(error, 'short')}`,
            ),
        sender: rawQuoteProps.sender,
    };
}

/**
 * Returns the message's file props including the thumbnail `blobStore` if the file has a thumbnail.
 */
export function transformMessageFileProps(
    fileProps: MessagePreviewListProps['items'][u53]['messages'][u53]['file'],
    messageId: MessageId,
    receiverLookup: DbReceiverLookup,
    services: Pick<AppServices, 'blobCache'>,
    contentLength: u53 = 0,
): MessageProps['file'] {
    // If the message doesn't have any file, keep its `fileProps` `undefined`.
    if (fileProps === undefined) {
        return undefined;
    }

    // If the file doesn't include a thumbnail, keep the `fileProps` unchanged.
    if (fileProps.thumbnail === undefined) {
        return fileProps as Omit<
            NonNullable<MessagePreviewListProps['items'][u53]['messages'][u53]['file']>,
            'thumbnail'
        >;
    }

    // If `fileProps` contain a thumbnail, fetch the corresponding `BlobStore`.
    return Object.assign(fileProps, {
        thumbnail: {
            ...fileProps.thumbnail,
            constraints: {
                min: {
                    width: Math.min(128 + contentLength, 176),
                    height: 70,
                    size: 16384,
                },
                max: {
                    width: 320,
                    height: 196,
                    size: 30000,
                },
            },
            blobStore: services.blobCache.getMessageThumbnail(messageId, receiverLookup),
        },
    });
}
