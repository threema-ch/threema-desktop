import type {DbReceiverLookup} from '~/common/db';
import type {BlobCacheService} from '~/common/dom/ui/blob-cache';
import {downsizeImage} from '~/common/dom/utils/image';
import type {IFrontendMediaService} from '~/common/media';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {PROXY_HANDLER, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';

// TODO(DESK-1342): Better document these variables
export const MAX_IMAGE_MESSAGE_SIZE = 384;
// This is double the set max height and max width
export const LOCAL_THUMBNAIL_MAX_SIZE = MAX_IMAGE_MESSAGE_SIZE * 2;
// Can be tuned in case files get too large
export const THUMBNAIL_QUALITY = 0.92;

export class FrontendMediaService implements IFrontendMediaService {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    private _blobCacheService: BlobCacheService | undefined = undefined;

    /**
     * Pass in a reference to the {@link BlobCacheService}.
     *
     * Note: This is necessary because the blob cache service does not yet exist when creating the
     * frontend media service.
     */
    public setBlobCacheService(blobCacheService: BlobCacheService): void {
        if (this._blobCacheService === undefined) {
            this._blobCacheService = blobCacheService;
        }
    }

    /** @inheritdoc */
    public async generateImageThumbnail(
        bytes: ReadonlyUint8Array,
        mediaType: string,
    ): Promise<FileBytesAndMediaType> {
        const downsizedImage = await downsizeImage(
            new Blob([bytes], {type: mediaType}),
            mediaType,
            LOCAL_THUMBNAIL_MAX_SIZE,
            THUMBNAIL_QUALITY,
        );
        if (downsizedImage === undefined) {
            throw new Error('Failed to downsize image');
        }
        const arrayBuffer = await downsizedImage.resized.arrayBuffer();
        return {
            bytes: new Uint8Array(arrayBuffer),
            mediaType,
        };
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async generateVideoThumbnail(
        bytes: ReadonlyUint8Array,
        mediaType: string,
    ): Promise<FileBytesAndMediaType> {
        // TODO(DESK-1306)
        throw new Error('Generation of video thumbnail not yet implemented');
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    public async refreshThumbnailCacheForMessage(
        messageId: MessageId,
        receiverLookup: DbReceiverLookup,
    ): Promise<void> {
        if (this._blobCacheService === undefined) {
            throw new Error(
                'Cannot set message thumbnail because the blob cache service is not initialized.',
            );
        }
        this._blobCacheService.refreshCacheForMessage(messageId, receiverLookup);
    }
}
