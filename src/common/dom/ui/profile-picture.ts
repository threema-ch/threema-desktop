import type {DbReceiverLookup} from '~/common/db';
import type {BackendController} from '~/common/dom/backend/controller';
import {ReceiverType, ReceiverTypeUtils} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {AsyncLock} from '~/common/utils/lock';
import {eternalPromise} from '~/common/utils/promise';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';

/**
 * Transform profile picture bytes into a blob or a promise of a blob.
 */
export function transformProfilePicture(
    picture: ReadonlyUint8Array | undefined,
): Blob | Promise<Blob> {
    if (picture === undefined) {
        return eternalPromise();
    }
    return new Blob([picture], {type: 'image/jpeg'});
}

export type ProfilePictureBlobStore = IQueryableStore<Blob | undefined>;

type CacheKey = string;

/**
 * Return a cache key for the specified {@link receiverLookup} by concatenating type and UID.
 */
function cacheKeyFor(receiverLookup: DbReceiverLookup): CacheKey {
    return `${receiverLookup.type}.${receiverLookup.uid}`;
}

/**
 * The profile picture service fetches and caches profile pictures for contacts and groups.
 */
export class ProfilePictureService {
    private readonly _lock = new AsyncLock();
    private readonly _cache = new Map<CacheKey, ProfilePictureBlobStore>();

    public constructor(
        private readonly _backend: BackendController,
        private readonly _log: Logger,
    ) {}

    /**
     * Return a derived profile picture store for this receiver.
     *
     * If the receiver cannot be found, return `undefined`. If the receiver can be found but doesn't
     * have a profile picture, a store containing `undefined` will be returned.
     */
    public async getProfilePictureForReceiver(
        receiverLookup: DbReceiverLookup,
    ): Promise<ProfilePictureBlobStore | undefined> {
        const {type, uid} = receiverLookup;

        return await this._lock.with(async () => {
            // Check the cache
            const cachedStore = this._cache.get(cacheKeyFor(receiverLookup));
            if (cachedStore !== undefined) {
                return cachedStore;
            }
            this._log.debug(`Cache miss for ${ReceiverTypeUtils.nameOf(type)} with UID ${uid}`);

            // Fetch the profile picture store for this receiver
            let profilePictureStore;
            switch (type) {
                case ReceiverType.CONTACT: {
                    const contactStore = await this._backend.model.contacts.getByUid(uid);
                    if (contactStore === undefined) {
                        return undefined;
                    }
                    profilePictureStore = await contactStore.get().controller.profilePicture;
                    break;
                }
                case ReceiverType.GROUP: {
                    const groupStore = await this._backend.model.groups.getByUid(uid);
                    if (groupStore === undefined) {
                        return undefined;
                    }
                    profilePictureStore = await groupStore.get().controller.profilePicture;
                    break;
                }
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-771): Support distribution lists
                    return undefined;
                default:
                    return unreachable(type);
            }

            // Return a derived store which wraps the bytes in a `Blob`
            const blobStore = derive(profilePictureStore, (profilePicture, getAndSubscribe) => {
                this._log.debug(
                    `Re-deriving profile picture store for ${ReceiverTypeUtils.nameOf(
                        type,
                    )} with UID ${uid}`,
                );
                const bytes = profilePicture.view.picture;
                return bytes === undefined ? undefined : new Blob([bytes]);
            });
            this._cache.set(cacheKeyFor(receiverLookup), blobStore);
            return blobStore;
        });
    }
}
