import type {AppServices} from '~/app/types';
import type {MessageProps} from '~/app/ui/components/molecules/message/props';
import type {RegularMessageProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/regular-message/props';
import type {DbReceiverLookup} from '~/common/db';
import type {MessageId} from '~/common/network/types';

/**
 * Returns the message's file props including the thumbnail `blobStore` if the file has a thumbnail.
 */
export function transformMessageFileProps(
    fileProps: RegularMessageProps['file'],
    messageId: MessageId,
    receiverLookup: DbReceiverLookup,
    services: Pick<AppServices, 'blobCache'>,
): MessageProps['file'] {
    // If the message doesn't have any file, keep its `fileProps` `undefined`.
    if (fileProps === undefined) {
        return undefined;
    }

    // If the file doesn't include a thumbnail, keep the `fileProps` unchanged.
    if (fileProps.thumbnail === undefined) {
        return fileProps as Omit<NonNullable<RegularMessageProps['file']>, 'thumbnail'>;
    }

    // If `fileProps` contain a thumbnail, fetch the corresponding `BlobStore`.
    return Object.assign(fileProps, {
        thumbnail: {
            ...fileProps.thumbnail,
            blobStore: services.blobCache.getMessageThumbnail(messageId, receiverLookup),
        },
    });
}
