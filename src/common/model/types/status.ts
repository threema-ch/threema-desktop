import type {DbConversationUid, DbStatusMessage, UidOf} from '~/common/db';
import type {StatusMessageType} from '~/common/enum';
import type {LocalModel} from '~/common/model/types/common';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {IdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

export type StatusMessage = GroupMemberChangeStatusView;

/**
 * The base status message with the mandatory fields all status messages must have.
 */
interface BaseStatusMessage {
    readonly conversationUid: DbConversationUid;
    readonly type: StatusMessageType;
    readonly createdAt: Date;
    readonly value: unknown;
    readonly ordinal: u53;
}

/**
 * BaseStatusMessage Controller with no functionality, whatsoever.
 * It is mainly used for creation of {@link LocalModelStores} of {@link StatusMessages}.
 */
export type BaseStatusMessageController<TStatusMessageView extends BaseStatusMessage> = {
    readonly uid: UidOf<DbStatusMessage>;
    readonly meta: ModelLifetimeGuard<TStatusMessageView>;
} & ProxyMarked;

// Group Member Changes
export interface GroupMemberChangeStatusView extends BaseStatusMessage {
    readonly type: StatusMessageType.GROUP_MEMBER_CHANGE;
    readonly value: {
        // IDs that were added to the group.
        readonly added: IdentityString[];
        // IDs that were removed from the group.
        readonly removed: IdentityString[];
    };
}

export type GroupMemberChanges = LocalModel<
    GroupMemberChangeStatusView,
    BaseStatusMessageController<GroupMemberChangeStatusView>,
    DbConversationUid,
    StatusMessageType.GROUP_MEMBER_CHANGE
>;

// Group Name Changes
export interface GroupNameChangeView extends BaseStatusMessage {
    readonly type: StatusMessageType.GROUP_NAME_CHANGE;
    readonly value: {
        // The old name of the group.
        readonly oldName: string;
        // The new name of the group.
        readonly newName: string;
    };
}

export type GroupNameChanges = LocalModel<
    GroupNameChangeView,
    BaseStatusMessageController<GroupNameChangeView>,
    DbConversationUid,
    StatusMessageType.GROUP_NAME_CHANGE
>;

// Union Types
export type AnyStatusMessage = GroupMemberChangeStatusView | GroupNameChangeView;

export type AnyStatusMessageModel = GroupMemberChanges | GroupNameChanges;

export type AnyStatusMessageModelStore =
    | LocalModelStore<GroupMemberChanges>
    | LocalModelStore<GroupNameChanges>;
