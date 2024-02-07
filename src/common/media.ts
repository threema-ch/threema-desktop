import type {DbReceiverLookup} from '~/common/db';
import type {Logger} from '~/common/logging';
import type {AnyFileBasedMessageModel} from '~/common/model/types/message';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {isSupportedImageType} from '~/common/utils/image';

export interface ThumbnailGenerator extends ProxyMarked {
    readonly generateImageThumbnail: (
        bytes: ReadonlyUint8Array,
        mediaType: string,
        log?: Logger,
    ) => Promise<FileBytesAndMediaType>;
    readonly generateVideoThumbnail: (
        bytes: ReadonlyUint8Array,
        mediaType: string,
        log?: Logger,
    ) => Promise<FileBytesAndMediaType>;
    readonly setCacheForMessage: (messageId: MessageId, receiverLookup: DbReceiverLookup) => void;
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
        let thumbnailData: FileBytesAndMediaType;
        switch (messageType) {
            case 'video':
                thumbnailData = await this._thumbnailGenerator.generateVideoThumbnail(
                    bytes,
                    mediaType,
                );
                break;
            case 'image':
                if (isSupportedImageType(mediaType)) {
                    thumbnailData = await this._thumbnailGenerator.generateImageThumbnail(
                        bytes,
                        mediaType,
                    );
                    break;
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
        return thumbnailData;
    }

    public async overwriteThumbnailCache(
        messageId: MessageId,
        dbReceiverLookup: DbReceiverLookup,
    ): Promise<void> {
        // Add the thumbnail to the cache so that the change can be seen in the frontend.
        await this._thumbnailGenerator
            .setCacheForMessage(messageId, dbReceiverLookup)
            .catch((error) => this._log.error('Failed to regenerate thumbnail', error));
    }
}
