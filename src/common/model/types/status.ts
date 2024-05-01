import type {DbConversationUid, DbStatusMessage, UidOf} from '~/common/db';
import type {StatusMessageType} from '~/common/enum';
import type {LocalModel} from '~/common/model/types/common';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString, StatusMessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

/**
 * The base status message with the mandatory fields all status messages must have.
 */
export interface StatusMessageView<TType extends StatusMessageType, TValue> {
    /**
     * UID of the associated conversation.
     */
    readonly conversationUid: DbConversationUid;
    /**
     * Date when this status message was created.
     */
    readonly createdAt: Date;
    /**
     * Unique identifier of this status message.
     */
    readonly id: StatusMessageId;
    /**
     * Ordinal for message ordering. Note: Higher `ordinal` means the message is newer.
     */
    readonly ordinal: u53;
    /**
     * Status message type.
     */
    readonly type: TType;
    /**
     * Structured data associated with this status message.
     */
    readonly value: TValue;
}

/**
 * BaseStatusMessage Controller with no functionality, whatsoever.
 * It is mainly used for creation of {@link LocalModelStores} of {@link StatusMessages}.
 */
export type StatusMessageController<TType extends StatusMessageType, TValue> = {
    readonly uid: UidOf<DbStatusMessage>;
    readonly meta: ModelLifetimeGuard<StatusMessageView<TType, TValue>>;
} & ProxyMarked;

type StatusModel<TType extends StatusMessageType, TValue> = LocalModel<
    StatusMessageView<TType, TValue>,
    StatusMessageController<TType, TValue>,
    DbConversationUid,
    TType
>;

/**
 * Status message that indicates a change in group members.
 */
export type GroupMemberChangeStatus = StatusModel<
    StatusMessageType.GROUP_MEMBER_CHANGE,
    {
        /** IDs that were added to the group. */
        readonly added: IdentityString[];
        /** IDs that were removed from the group. */
        readonly removed: IdentityString[];
    }
>;

/**
 * Status message that indicates a changed group name.
 */
export type GroupNameChangeStatus = StatusModel<
    StatusMessageType.GROUP_NAME_CHANGE,
    {
        /** The old name of the group. */
        readonly oldName: string;
        /** The new name of the group. */
        readonly newName: string;
    }
>;

// Union Types
export type AnyStatusMessageView = GroupMemberChangeStatus['view'] | GroupNameChangeStatus['view'];
export type AnyStatusMessageModel = GroupMemberChangeStatus | GroupNameChangeStatus;
export type AnyStatusMessageModelStore =
    | LocalModelStore<GroupMemberChangeStatus>
    | LocalModelStore<GroupNameChangeStatus>;
