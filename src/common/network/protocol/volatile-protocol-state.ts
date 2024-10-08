import type {ContactInitFragment} from '~/common/model/types/contact';
import type {GroupId, IdentityString} from '~/common/network/types';
import {tag, type WeakOpaque} from '~/common/types';

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
     *   "volatile" protocol session, and the timestamp of the last request otherwise.
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
     * @returns `undefined` if the specified identity has not been lookup up and the contact
     *   information together with the timestamp otherwise.
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
        return this._lastGroupSyncRequests.get(
            this._createGroupSyncRequestCacheKey(groupId, creatorIdentity, senderIdentity),
        );
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
        return this._lastContactLookups.get(
            this._createValidContactLookupCacheKey(contactIdentity),
        );
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
