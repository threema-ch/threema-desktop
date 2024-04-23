import type {GroupId, IdentityString} from '~/common/network/types';
import type {WeakOpaque} from '~/common/types';

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
}

type GroupSyncRequestsCacheKey = WeakOpaque<
    string,
    {readonly GroupSyncRequestsCacheKey: unique symbol}
>;

export class VolatileProtocolStateBackend implements VolatileProtocolState {
    private readonly _lastGroupSyncRequests = new Map<GroupSyncRequestsCacheKey, Date>();

    /** @inheritdoc */
    public getLastProcessedGroupSyncRequest(
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
    ): Date | undefined {
        return this._lastGroupSyncRequests.get(
            this._createCacheKey(groupId, creatorIdentity, senderIdentity),
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
            this._createCacheKey(groupId, creatorIdentity, senderIdentity),
            requestTimestamp,
        );
    }

    private _createCacheKey(
        groupId: GroupId,
        creatorIdentity: IdentityString,
        senderIdentity: IdentityString,
    ): GroupSyncRequestsCacheKey {
        return `${groupId}.${creatorIdentity}.${senderIdentity}` as GroupSyncRequestsCacheKey;
    }
}
