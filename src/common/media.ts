import type {DbReceiverLookup} from '~/common/db';
import type {MessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array, StrictExtract} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {isSupportedImageType} from '~/common/utils/image';

/**
 * This service provides media-related functionality that runs in the frontend.
 *
 * Among other things, it supports generating image and video thumbnails using DOM methods that are
 * not available in the backend worker.
 */
export interface IFrontendMediaService extends ProxyMarked {
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
     * Refresh the thumbnail cache for the specified message.
     */
    readonly refreshThumbnailCacheForMessage: (
        messageId: MessageId,
        receiverLookup: DbReceiverLookup,
    ) => void;
}

/**
 * The backend media service wraps and exposes the functionality of the
 * {@link IFrontendMediaService} in the backend.
 */
export class BackendMediaService {
    public constructor(
        private readonly _log: Logger,
        private readonly _frontendMediaService: RemoteProxy<IFrontendMediaService>,
    ) {}

    public async generateThumbnail(
        bytes: ReadonlyUint8Array,
        messageType: StrictExtract<MessageType, 'image' | 'video'>,
        mediaType: string,
    ): Promise<FileBytesAndMediaType | undefined> {
        try {
            switch (messageType) {
                case 'image':
                    if (isSupportedImageType(mediaType)) {
                        return await this._frontendMediaService.generateImageThumbnail(
                            bytes,
                            mediaType,
                        );
                    }
                    this._log.warn('Cannot generate thumbnail because image type is not supported');
                    return undefined;

                case 'video':
                    // TODO(DESK-1306): Do we need an `isSupportedVideoType` function?
                    return await this._frontendMediaService.generateVideoThumbnail(
                        bytes,
                        mediaType,
                    );

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
    public async refreshThumbnailCacheForMessage(
        messageId: MessageId,
        dbReceiverLookup: DbReceiverLookup,
    ): Promise<void> {
        await this._frontendMediaService
            .refreshThumbnailCacheForMessage(messageId, dbReceiverLookup)
            .catch((error: unknown) => this._log.error('Failed to regenerate thumbnail', error));
    }
}
