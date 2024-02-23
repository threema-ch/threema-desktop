import type {DbReceiverLookup} from '~/common/db';
import type {BackendController} from '~/common/dom/backend/controller';
import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import type {WeakOpaque} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import type {FileBytesAndMediaType} from '~/common/utils/file';
import {WeakValueMap} from '~/common/utils/map';
import {WritableStore, type IQueryableStore, type IQueryableStoreValue} from '~/common/utils/store';

export type BlobStore = IQueryableStore<'loading' | Blob | undefined>;

type CacheKey = WeakOpaque<string, {readonly CacheKey: unique symbol}>;

function cacheKeyForMessageThumbnail(
    messageId: MessageId,
    receiverLookup: DbReceiverLookup,
): CacheKey {
    return `thumb.${receiverLookup.type}.${receiverLookup.uid}.${messageId}` as CacheKey;
}

/**
 * The blob cache service caches blob stores.
 *
 * The stores in the cache are weakly referenced. This means that if all references to the store are
 * dropped, then it will be automatically removed from the cache when garbage collection kicks in.
 */
export class BlobCacheService {
    private readonly _cache = new WeakValueMap<CacheKey, BlobStore>();

    public constructor(
        private readonly _backend: BackendController,
        private readonly _log: Logger,
    ) {}

    /**
     * Return the {@link BlobStore} associated with the specified {@link messageId} within the
     * conversation with {@link receiverLookup}.
     *
     * The store will be returned immediately with the value 'loading'. It will be updated
     * asynchronously with the thumbnail bytes. If the message cannot be found or if there is no
     * thumbnail, then the store will be updated with `undefined`.
     */
    public getMessageThumbnail(messageId: MessageId, receiverLookup: DbReceiverLookup): BlobStore {
        const key = cacheKeyForMessageThumbnail(messageId, receiverLookup);
        return this._cache.getOrCreate(key, () => {
            const store = new WritableStore<IQueryableStoreValue<BlobStore>>('loading');
            this._getMessageThumbnailBytes(messageId, receiverLookup)
                .then((result) => {
                    store.set(
                        result === undefined
                            ? undefined
                            : new Blob([result.bytes], {type: result.mediaType}),
                    );
                })
                .catch((error) =>
                    this._log.warn(`Failed to fetch message thumbnail bytes: ${error}`),
                );
            return store;
        });
    }

    /**
     * Refresh the cache from the database and update the associated store.
     */
    public refreshCacheForMessage(messageId: MessageId, receiverLookup: DbReceiverLookup): void {
        const key = cacheKeyForMessageThumbnail(messageId, receiverLookup);
        // TODO(DESK-1342): This is wrong, we may not replace the store, we must update it!
        const store = new WritableStore<IQueryableStoreValue<BlobStore>>('loading');
        this._getMessageThumbnailBytes(messageId, receiverLookup)
            .then((result) => {
                store.set(
                    result === undefined
                        ? undefined
                        : new Blob([result.bytes], {type: result.mediaType}),
                );
                this._cache.set(key, store);
            })
            .catch((error) => this._log.warn(`Failed to fetch message thumbnail bytes: ${error}`));
    }

    /**
     * Return the thumbnail bytes for the specified {@link messageId} within the conversation with
     * {@link receiverLookup}.
     *
     * Return `undefined` in the following cases:
     *
     * - The converseation was not found
     * - The message was not found
     * - The message does not have a thumbnail
     *
     * Otherwise, return the thumbnail bytes along with the media type.
     */
    private async _getMessageThumbnailBytes(
        messageId: MessageId,
        receiverLookup: DbReceiverLookup,
    ): Promise<FileBytesAndMediaType | undefined> {
        const conversation = await this._backend.model.conversations.getForReceiver(receiverLookup);
        if (conversation === undefined) {
            return undefined;
        }
        const message = await conversation.get().controller.getMessage(messageId);
        if (message === undefined) {
            return undefined;
        }
        switch (message.type) {
            case 'image':
            case 'video':
                return await message.get().controller.thumbnailBlob();
            case 'text':
            case 'audio':
            case 'file':
                return undefined;
            default:
                return unreachable(message);
        }
    }
}
