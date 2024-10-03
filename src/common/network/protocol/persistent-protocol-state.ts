import type {DbPersistentProtocolState, DbPersistentProtocolStateUid} from '~/common/db';
import {PersistentProtocolStateType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {ServicesForModel} from '~/common/model';
import type {IdentityString} from '~/common/network/types';
import {
    LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS,
    PERSISTENT_PROTOCOL_STATE_CODEC,
    type UserProfileDistributionCacheKey,
    type UserProfileDistributionCacheValue,
    type UserProfileDistributionProtocolValue,
} from '~/common/network/types/persistent-protocol-state';
import {tag} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

/**
 * A storage that contains the persisted protocol state. The state is persisted, and is loaded on
 * every start of the app.
 */
export interface PersistentProtocolState {
    /**
     * Get the user profile state distribution cache entry for a given receiver, if any.
     *
     * Returns undefined if there is no cache entry or if it has expired.
     *
     * As a side effect, this function cleans up expired entries in the cache.
     */
    readonly getLastUserProfileDistributionState: (
        receiverIdentity: IdentityString,
    ) => UserProfileDistributionProtocolValue | undefined;

    /**
     * Set a new profile state distribution cache entry for a given receiver.
     *
     * If a cache entry already exists for that receiver, this entry is overwritten and the old
     * entry is deleted.
     */
    readonly setLastUserProfileDistributionState: (
        receiverIdentity: IdentityString,
        value: UserProfileDistributionProtocolValue,
        createdAt: Date,
    ) => void;
}

export class PersistentProtocolStateBackend implements PersistentProtocolState {
    private readonly _log: Logger;

    private readonly _userProfileDistributionCache = new Map<
        UserProfileDistributionCacheKey,
        UserProfileDistributionCacheValue
    >();

    public constructor(private readonly _services: Pick<ServicesForModel, 'db' | 'logging'>) {
        this._log = _services.logging.logger(`persistent-protocol-state`);
        const state = this._services.db.getPersistentProtocolState();
        for (const entry of state) {
            this._deserializeFromDatabaseAndSet(entry);
        }
    }

    /** @inheritdoc */
    public getLastUserProfileDistributionState(
        receiverIdentity: IdentityString,
    ): UserProfileDistributionProtocolValue | undefined {
        this._cleanup(PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE);
        return this._userProfileDistributionCache.get(
            this._createUserProfileDistributionCacheKey(receiverIdentity),
        );
    }

    /** @inheritdoc */
    public setLastUserProfileDistributionState(
        receiverIdentity: IdentityString,
        value: UserProfileDistributionProtocolValue,
        createdAt: Date,
    ): void {
        const encoded = PERSISTENT_PROTOCOL_STATE_CODEC[
            PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE
        ].encode({receiverIdentity, profilePicture: value});

        const cacheKey = this._createUserProfileDistributionCacheKey(receiverIdentity);

        const currentCacheValue = this._userProfileDistributionCache.get(cacheKey);

        // Delete the old cache value from the database if necessary
        if (currentCacheValue !== undefined) {
            this._services.db.deletePersistentProtocolStateEntriesByUids([currentCacheValue.uid]);
        }

        // Add a new Db entry
        const uid = this._services.db.updatePersistentProtocolState({
            createdAt,
            stateBytes: encoded,
            type: PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE,
        });

        // Update the map
        this._userProfileDistributionCache.set(
            this._createUserProfileDistributionCacheKey(receiverIdentity),
            {...value, createdAt, uid},
        );

        this._cleanup(PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE);
    }

    private _createUserProfileDistributionCacheKey(
        receiver: IdentityString,
    ): UserProfileDistributionCacheKey {
        return tag<UserProfileDistributionCacheKey>(receiver);
    }

    private _deserializeFromDatabaseAndSet(
        dbState: DbPersistentProtocolState<PersistentProtocolStateType>,
    ): void {
        switch (dbState.type) {
            case PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE: {
                if (
                    Date.now() - dbState.createdAt.getTime() >
                    LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS * 1000
                ) {
                    this._services.db.deletePersistentProtocolStateEntriesByUids([dbState.uid]);
                    return;
                }

                const decoded = PERSISTENT_PROTOCOL_STATE_CODEC[dbState.type].decode(
                    dbState.stateBytes,
                );

                const key = this._createUserProfileDistributionCacheKey(decoded.receiverIdentity);

                const oldValue = this._userProfileDistributionCache.get(key);

                if (oldValue !== undefined) {
                    this._log.warn(
                        'Duplicate last user profile distribution state for receiver in database',
                    );
                }

                // Only ever set the most recent value in the cache
                if (
                    oldValue === undefined ||
                    dbState.createdAt.getTime() > oldValue.createdAt.getTime()
                ) {
                    this._userProfileDistributionCache.set(key, {
                        ...decoded.profilePicture,
                        createdAt: dbState.createdAt,
                        uid: dbState.uid,
                    });
                }
                return;
            }
            default:
                unreachable(dbState.type);
        }
    }

    private _cleanup(type: PersistentProtocolStateType): void {
        const toBeDeleted: DbPersistentProtocolStateUid[] = [];

        switch (type) {
            case PersistentProtocolStateType.LAST_USER_PROFILE_DISTRIBUTION_STATE: {
                for (const [key, value] of this._userProfileDistributionCache.entries()) {
                    if (
                        Date.now() - value.createdAt.getTime() >
                        LAST_USER_PROFILE_ENTRY_EXPIRATION_SECONDS * 1000
                    ) {
                        toBeDeleted.push(value.uid);
                        this._userProfileDistributionCache.delete(key);
                    }
                }
                this._services.db.deletePersistentProtocolStateEntriesByUids(toBeDeleted);
                if (toBeDeleted.length > 0) {
                    this._log.debug(
                        `Deleted ${toBeDeleted.length} stale entries from the database`,
                    );
                }
                return;
            }
            default:
                unreachable(type);
        }
    }
}
