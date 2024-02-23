import type {DbReceiverLookup} from '~/common/db';
import type {Logger} from '~/common/logging';
import type {AnyFileBasedMessageModel} from '~/common/model/types/message';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {isSupportedImageType} from '~/common/utils/image';

export interface ThumbnailGenerator extends ProxyMarked {
    /**
     * Generate an image thumbnail from the specified image bytes.
     */
    readonly generateImageThumbnail: (
        bytes: ReadonlyUint8Array,
        mediaType: string,
        log?: Logger,
    ) => Promise<FileBytesAndMediaType>;

    /**
     * Generate an image thumbnail from the specified video bytes.
     */
    readonly generateVideoThumbnail: (
        bytes: ReadonlyUint8Array,
        mediaType: string,
        log?: Logger,
    ) => Promise<FileBytesAndMediaType>;

    /**
     * Refresh the thumbnail cache for the specified message by re-loading the thumbnail.
     */
    readonly refreshCacheForMessage: (
        messageId: MessageId,
        receiverLookup: DbReceiverLookup,
    ) => void;
}

export class MediaService {
    public constructor(
        private readonly _log: Logger,
        private readonly _thumbnailGenerator: RemoteProxy<ThumbnailGenerator>,
    ) {}

    public async generateThumbnail(
        bytes: ReadonlyUint8Array,
        messageType: AnyFileBasedMessageModel['type'],
        mediaType: string,
    ): Promise<FileBytesAndMediaType | undefined> {
        try {
            switch (messageType) {
                case 'video':
                    return await this._thumbnailGenerator.generateVideoThumbnail(bytes, mediaType);

                case 'image':
                    if (isSupportedImageType(mediaType)) {
                        return await this._thumbnailGenerator.generateImageThumbnail(
                            bytes,
                            mediaType,
                        );
                    }
                    this._log.warn('Cannot generate thumbnail because image type is not supported');
                    return undefined;

                case 'audio':
                case 'file':
                    this._log.warn('Cannot generate thumbnail because file type has no thumbnail');
                    return undefined;

                default:
                    unreachable(messageType);
            }
        } catch (error) {
            this._log.error(`Thumbnail generation failed: ${ensureError(error)}`);
        }

        return undefined;
    }

    /**
     * Refresh the thumbnail cache for the specified message by re-loading the thumbnail.
     */
    public async refreshThumbnailCache(
        messageId: MessageId,
        dbReceiverLookup: DbReceiverLookup,
    ): Promise<void> {
        await this._thumbnailGenerator
            .refreshCacheForMessage(messageId, dbReceiverLookup)
            .catch((error) => this._log.error('Failed to regenerate thumbnail', error));
    }
}
