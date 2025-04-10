import type {DbReceiverLookup} from '~/common/db';
import type {BackendController} from '~/common/dom/backend/controller';
import {ReceiverType, ReceiverTypeUtils} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ProfilePictureView} from '~/common/model';
import type {ProfilePictureModelStore} from '~/common/model/profile-picture';
import type {Dimensions, ReadonlyUint8Array} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {
    WritableStore,
    type IQueryableStore,
    type IWritableStore,
    type RemoteStore,
} from '~/common/utils/store';

/**
 * Transform profile picture to a blob (with media type "image/jpeg").
 */
export function transformProfilePicture(bytes: ReadonlyUint8Array | undefined): Blob | undefined {
    if (bytes === undefined) {
        return undefined;
    }
    return new Blob([bytes], {type: 'image/jpeg'});
}

export type ProfilePictureBlobStoreValue =
    | {readonly blob: Blob; readonly dimensions: Dimensions}
    | undefined;

type CacheKey = string;

const USER_CACHE_KEY = 'me';

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
    private readonly _cacheLock = new AsyncLock();
    private readonly _subscriberLock = new AsyncLock<'locked'>();
    private readonly _cache = new Map<
        CacheKey,
        {
            readonly blobStore: IWritableStore<ProfilePictureBlobStoreValue>;
            // This needs to be held so that the references and subscribers are not garbage
            // collected.
            readonly sourceStore:
                | Remote<ProfilePictureModelStore>
                | RemoteStore<ProfilePictureView>;
        }
    >();

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
    ): Promise<IQueryableStore<ProfilePictureBlobStoreValue> | undefined> {
        const {type, uid} = receiverLookup;

        return await this._cacheLock.with(async () => {
            const cacheKey = cacheKeyFor(receiverLookup);
            // Check the cache.
            const cachedStore = this._cache.get(cacheKey);
            if (cachedStore !== undefined) {
                return cachedStore.blobStore;
            }
            this._log.debug(`Cache miss for ${ReceiverTypeUtils.nameOf(type)} with UID ${uid}`);

            // Fetch the profile picture store for this receiver.
            let profilePictureModelStore;
            switch (type) {
                case ReceiverType.CONTACT: {
                    const contactStore = await this._backend.model.contacts.getByUid(uid);
                    if (contactStore === undefined) {
                        return undefined;
                    }
                    profilePictureModelStore = await contactStore.get().controller.profilePicture;
                    break;
                }
                case ReceiverType.GROUP: {
                    profilePictureModelStore =
                        await this._backend.model.groups.getProfilePicture(uid);
                    if (profilePictureModelStore === undefined) {
                        return undefined;
                    }
                    break;
                }
                case ReceiverType.DISTRIBUTION_LIST:
                    // TODO(DESK-771): Support distribution lists.
                    return undefined;
                default:
                    return unreachable(type);
            }

            const blobStore = new WritableStore<ProfilePictureBlobStoreValue>(undefined);

            this._cache.set(cacheKey, {
                blobStore,
                sourceStore: profilePictureModelStore,
            });

            profilePictureModelStore.subscribe((value): void => {
                this._subscriberLock
                    .with(async () => {
                        await this._setBlobStore(value.view, blobStore);
                    }, 'locked')
                    .catch((error: unknown) =>
                        this._log.error(
                            `Failed to create bitmap for ${ReceiverTypeUtils.nameOf(type)} with UID ${uid} with reason: `,
                            error,
                        ),
                    );
            });

            return blobStore;
        });
    }

    /**
     * Return the profile picture store for the user themself.
     */
    public getProfilePictureForSelf(): IQueryableStore<ProfilePictureBlobStoreValue> {
        // Check the cache.
        const cachedStore = this._cache.get(USER_CACHE_KEY);
        if (cachedStore !== undefined) {
            return cachedStore.blobStore;
        }
        this._log.debug(`Cache miss for the user's own profile picture`);

        const blobStore = new WritableStore<ProfilePictureBlobStoreValue>(undefined);

        this._cache.set(USER_CACHE_KEY, {
            blobStore,
            sourceStore: this._backend.user.profilePicture,
        });

        this._backend.user.profilePicture.subscribe((view): void => {
            this._subscriberLock
                .with(async () => {
                    await this._setBlobStore(view, blobStore);
                }, 'locked')
                .catch((error: unknown) => {
                    this._log.error(
                        'Failed to create bitmap for user profile picture with reason: ',
                        error,
                    );
                });
        });

        return blobStore;
    }

    private async _setBlobStore(
        view: ProfilePictureView,
        blobStore: WritableStore<ProfilePictureBlobStoreValue>,
    ): Promise<void> {
        assert(
            this._subscriberLock.context === 'locked',
            'Subscriber lock must be locked when setting the profile picture blob store',
        );
        const picture = view.picture;
        if (picture === undefined) {
            blobStore.set(undefined);
            return;
        }
        const blob = new Blob([picture], {type: 'image/png'});
        const bitmap = await createImageBitmap(blob);
        blobStore.set({
            blob,
            dimensions: {height: bitmap.height, width: bitmap.width},
        });
        bitmap.close();
    }
}
