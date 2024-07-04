import type {StatusMessageType} from '~/common/enum';
import type {StatusMessageId} from '~/common/network/types';
import type {u53} from '~/common/types';

interface StatusMessageStatusMap {
    /** Status message that indicates that a chat was restored. */
    [StatusMessageType.CHAT_RESTORED]: object;

    /** Status message that indicates a change in group members. */
    [StatusMessageType.GROUP_MEMBER_CHANGED]: {
        /** Display names of members that were added to the group (including the user). */
        readonly added: string[];
        /** Display names of members that were removed from the group (including the user). */
        readonly removed: string[];
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
        /**
         * Display name of the group member (including the creator and the user) who started the
         * group call.
         */
        readonly startedBy: string;
    };

    /** Status message that indicates a group call ended. */
    [StatusMessageType.GROUP_CALL_ENDED]: object;
}

export type AnyStatusMessageStatus = {
    [TType in StatusMessageType]: {readonly type: TType} & StatusMessageStatusMap[TType];
}[StatusMessageType];

/**
 * Data to be supplied to the UI layer as part of the `ViewModelStore`. This should be as close as
 * possible to the `StatusMessageProps` that the message component expects, excluding props that
 * only exist in the ui layer.
 */
export interface ConversationStatusMessageViewModel {
    readonly type: 'status-message';
    readonly created: {
        readonly at: Date;
    };
    readonly id: StatusMessageId;
    /**
     * Ordinal for message ordering in the conversation list.
     */
    readonly ordinal: u53;
    readonly status: AnyStatusMessageStatus;
}
