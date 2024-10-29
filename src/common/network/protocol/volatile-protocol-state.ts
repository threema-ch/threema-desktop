import type {ContactInitFragment} from '~/common/model/types/contact';
import type {GroupId, IdentityString} from '~/common/network/types';
import {tag, type WeakOpaque} from '~/common/types';

// Lifetime constants as defined by the protocol.
const GROUP_SYNC_REQUEST_CACHE_ENTRY_LIFETIME_MS = 3.6e6; // One hour
const VALID_CONTACT_LOOKUP_CACHE_ENTRY_LIFETIME_MS = 60_000;

type GroupSyncRequestsCacheKey = WeakOpaque<
    string,
    {readonly GroupSyncRequestsCacheKey: unique symbol}
>;

type ValidContactLookupCacheKey = WeakOpaque<
    string,
    {readonly ValidContactLookupCacheKey: unique symbol}
>;

interface ValidContactLookupCacheValue {
    createdAt: Date;
    lookup: ContactInitFragment | 'invalid';
}

/**
 * A storage that contains the volatile protocol state. The state is not persisted, and will be
 * empty on every start of the app.
 */
export interface VolatileProtocolState {
    /**
     * Get the timestamp of the last processed `GroupSyncRequest` of a group from the specified
     * {@link senderIdentity}.
     *
     * @returns `undefined` if the specified sender has never requested a group sync in this
     *   "volatile" protocol session or if the corresponding entry has expired, and the timestamp of
     *   the last request otherwise.
     *
     *   Note: Deletes the corresponding cache etnry if it has expired.
     */
    readonly getLastProcessedGroupSyncRequest: (
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
    ) => Date | undefined;

    /**
     * Set the timestamp of the last processed `GroupSyncRequest` of a group from the specified
     * {@link senderIdentity}.
     */
    readonly setLastProcessedGroupSyncRequest: (
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
        requestTimestamp: Date,
    ) => void;

    /**
     * Get the timestamp and the {@link ContactInit} of a contact specified by `contactIdentity.
     *
     * @returns `undefined` if the specified identity has not been lookup up or is expired and the
     *   contact information together with the timestamp otherwise.
     *
     *   Note: Deletes the corresponding cache etnry if it has expired.
     */
    readonly getValidContactLookup: (
        contactIdentity: IdentityString,
    ) => ValidContactLookupCacheValue | undefined;

    /**
     * Set the cache entry of a given contact specified by `identity`
     */
    readonly setValidContactLookup: (
        contactIdentity: IdentityString,
        lookup: ValidContactLookupCacheValue['lookup'],
        lookupTimestamp: Date,
    ) => void;
}

export class VolatileProtocolStateBackend implements VolatileProtocolState {
    private readonly _lastGroupSyncRequests = new Map<GroupSyncRequestsCacheKey, Date>();
    private readonly _lastContactLookups = new Map<
        ValidContactLookupCacheKey,
        ValidContactLookupCacheValue
    >();

    /** @inheritdoc */
    public getLastProcessedGroupSyncRequest(
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
    ): Date | undefined {
        const key = this._createGroupSyncRequestCacheKey(groupId, creatorIdentity, senderIdentity);
        const lookup = this._lastGroupSyncRequests.get(key);
        if (lookup === undefined) {
            return undefined;
        }
        if (Date.now() - lookup.getTime() > GROUP_SYNC_REQUEST_CACHE_ENTRY_LIFETIME_MS) {
            this._lastGroupSyncRequests.delete(key);
            return undefined;
        }
        return lookup;
    }

    /** @inheritdoc */
    public setLastProcessedGroupSyncRequest(
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
        requestTimestamp: Date,
    ): void {
        this._lastGroupSyncRequests.set(
            this._createGroupSyncRequestCacheKey(groupId, creatorIdentity, senderIdentity),
            requestTimestamp,
        );
    }

    /** @inheritdoc */
    public getValidContactLookup(
        contactIdentity: IdentityString,
    ): ValidContactLookupCacheValue | undefined {
        const key = this._createValidContactLookupCacheKey(contactIdentity);
        const lookup = this._lastContactLookups.get(key);
        if (lookup === undefined) {
            return undefined;
        }
        if (
            Date.now() - lookup.createdAt.getTime() >
            VALID_CONTACT_LOOKUP_CACHE_ENTRY_LIFETIME_MS
        ) {
            this._lastContactLookups.delete(key);
            return undefined;
        }
        return lookup;
    }

    /** @inheritdoc */
    public setValidContactLookup(
        contactIdentity: IdentityString,
        lookup: ValidContactLookupCacheValue['lookup'],
        lookupTimestamp: Date,
    ): void {
        this._lastContactLookups.set(this._createValidContactLookupCacheKey(contactIdentity), {
            lookup,
            createdAt: lookupTimestamp,
        });
    }

    private _createGroupSyncRequestCacheKey(
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
    ): GroupSyncRequestsCacheKey {
        return tag<GroupSyncRequestsCacheKey>(`${groupId}.${creatorIdentity}.${senderIdentity}`);
    }

    private _createValidContactLookupCacheKey(
        contactIdentity: IdentityString,
    ): ValidContactLookupCacheKey {
        return tag<ValidContactLookupCacheKey>(contactIdentity);
    }
}
