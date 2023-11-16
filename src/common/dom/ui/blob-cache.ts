import type {DbReceiverLookup} from '~/common/db';
import type {BackendController} from '~/common/dom/backend/controller';
import type {Logger} from '~/common/logging';
import type {MessageId} from '~/common/network/types';
import type {ReadonlyUint8Array, WeakOpaque} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
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

    public getMessageThumbnail(messageId: MessageId, receiverLookup: DbReceiverLookup): BlobStore {
        const key = cacheKeyForMessageThumbnail(messageId, receiverLookup);
        return this._cache.getOrCreate(key, () => {
            const store = new WritableStore<IQueryableStoreValue<BlobStore>>('loading');
            this._getMessageThumbnailBytes(messageId, receiverLookup)
                .then((bytes) => {
                    store.set(bytes === undefined ? undefined : new Blob([bytes]));
                })
                .catch((error) =>
                    this._log.warn(`Failed to fetch message thumbnail bytes: ${error}`),
                );
            return store;
        });
    }

    private async _getMessageThumbnailBytes(
        messageId: MessageId,
        receiverLookup: DbReceiverLookup,
    ): Promise<ReadonlyUint8Array | undefined> {
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
