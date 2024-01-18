import type {DbReceiverLookup} from '~/common/db';
import type {Logger} from '~/common/logging';
import type {AnyMessageModelStore, AnyTextMessageModelStore} from '~/common/model/types/message';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {ProxyMarked, RemoteProxy} from '~/common/utils/endpoint';
import {isSupportedImageType} from '~/common/utils/image';

export interface ThumbnailGenerator extends ProxyMarked {
    readonly generateImageThumbnail: (
        data: ReadonlyUint8Array,
        fileType: string,
        log?: Logger,
    ) => Promise<ReadonlyUint8Array>;
    readonly generateVideoThumbnail: (
        data: ReadonlyUint8Array,
        log?: Logger,
    ) => Promise<ReadonlyUint8Array>;
    readonly setCacheForMessage: (messageId: MessageId, receiverLookup: DbReceiverLookup) => void;
}

export class MediaService {
    public constructor(
        private readonly _log: Logger,
        private readonly _thumbnailGenerator: RemoteProxy<ThumbnailGenerator>,
    ) {}

    public async generateThumbnail(
        data: ReadonlyUint8Array,
        mediaType: Exclude<AnyMessageModelStore['type'], AnyTextMessageModelStore['type']>,
        fileType: string,
    ): Promise<ReadonlyUint8Array | undefined> {
        let thumbnailData: ReadonlyUint8Array;
        switch (mediaType) {
            case 'video':
                thumbnailData = await this._thumbnailGenerator.generateVideoThumbnail(data);
                break;
            case 'image':
                if (isSupportedImageType(fileType)) {
                    thumbnailData = await this._thumbnailGenerator.generateImageThumbnail(
                        data,
                        fileType,
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
                unreachable(mediaType);
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
