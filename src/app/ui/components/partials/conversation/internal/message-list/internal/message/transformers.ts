import type {AppServices} from '~/app/types';
import type {MessageProps as BasicMessageProps} from '~/app/ui/components/molecules/message/props';
import type {MessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message/props';
import type {DbReceiverLookup} from '~/common/db';
import type {MessageId} from '~/common/network/types';

/**
 * Returns the message's file props including the thumbnail `blobStore` if the file has a thumbnail.
 */
export function transformMessageFileProps(
    fileProps: MessageProps['file'],
    messageId: MessageId,
    receiverLookup: DbReceiverLookup,
    services: Pick<AppServices, 'blobCache'>,
): BasicMessageProps['file'] {
    // If the message doesn't have any file, keep its `fileProps` `undefined`.
    if (fileProps === undefined) {
        return undefined;
    }

    // If the file doesn't include a thumbnail, keep the `fileProps` unchanged.
    if (fileProps.thumbnail === undefined) {
        return fileProps as Omit<NonNullable<MessageProps['file']>, 'thumbnail'>;
    }

    // If `fileProps` contain a thumbnail, fetch the corresponding `BlobStore`.
    return Object.assign(fileProps, {
        thumbnail: {
            ...fileProps.thumbnail,
            blobStore: services.blobCache.getMessageThumbnail(messageId, receiverLookup),
        },
    });
}
