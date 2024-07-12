import type {DbConversationUid, DbStatusMessageUid} from '~/common/db';
import type {GroupUserState, StatusMessageType} from '~/common/enum';
import type {LocalModel} from '~/common/model/types/common';
import type {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {GroupCallId} from '~/common/network/protocol/call/group-call';
import type {IdentityString, StatusMessageId} from '~/common/network/types';
import type {u53} from '~/common/types';
import type {ProxyMarked} from '~/common/utils/endpoint';

/** Values associated to status messages. */
export interface StatusMessageValues {
    /** Status message that indicates that a chat was restored. */
    [StatusMessageType.CHAT_RESTORED]: object;

    /** Status message that indicates a change in group members. */
    [StatusMessageType.GROUP_MEMBER_CHANGED]: {
        /** IDs that were added to the group (including the user). */
        readonly added: IdentityString[];
        /** IDs that were removed from the group (including the user). */
        readonly removed: IdentityString[];
    };

    /** Status message that indicates a changed group name. */
    [StatusMessageType.GROUP_NAME_CHANGED]: {
        /** The old name of the group. */
        readonly oldName: string;
        /** The new name of the group. */
        readonly newName: string;
    };

    /** Status message that indicates a group call has been started. */
    [StatusMessageType.GROUP_CALL_STARTED]: {
        /** Group Call ID identifying the group call. */
        readonly callId: GroupCallId;
        /** Group member (including the creator and the user) who started the group call. */
        readonly startedBy: IdentityString;
    };

    /** Status message that indicates a group call ended. */
    [StatusMessageType.GROUP_CALL_ENDED]: {
        /** Group Call ID identifying the group call. */
        readonly callId: GroupCallId;
        /** Group member (including the creator and the user) who started the group call. */
        readonly startedBy: IdentityString;
    };

    /** Status message that indicates a change of the user state in a group. */
    [StatusMessageType.GROUP_USER_STATE_CHANGED]: {
        /** The new user state. */
        readonly newUserState: GroupUserState;
    };
}

/**
 * The base status message with the mandatory fields all status messages must have.
 */
export interface StatusMessageView<TType extends StatusMessageType> {
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
    readonly value: StatusMessageValues[TType];
}

/**
 * Status message controller with no functionality, whatsoever. It is mainly used for creation of
 * {@link LocalModelStores} of {@link StatusMessages}.
 */
export type StatusMessageController<TType extends StatusMessageType> = {
    readonly meta: ModelLifetimeGuard<StatusMessageView<TType>>;
    readonly uid: DbStatusMessageUid;
} & ProxyMarked;

/** Models associated to status messages. */
export type StatusMessageModels = {
    readonly [TType in StatusMessageType]: LocalModel<
        StatusMessageView<TType>,
        StatusMessageController<TType>,
        DbConversationUid,
        TType
    >;
};
export type StatusMessageModelStores = {
    [TType in StatusMessageType]: LocalModelStore<StatusMessageModels[TType]>;
};

// Union Types
export type AnyStatusMessageModel = StatusMessageModels[StatusMessageType];
export type AnyStatusMessageView = StatusMessageModels[StatusMessageType]['view'];
export type AnyStatusMessageModelStore = StatusMessageModelStores[StatusMessageType];
