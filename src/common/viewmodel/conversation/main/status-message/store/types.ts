import type {IdentityString, StatusMessageId} from '~/common/network/types';
import type {u53} from '~/common/types';

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

export type AnyStatusMessageStatus =
    | GroupMemberChangeStatusMessageStatus
    | GroupNameChangeStatusMessageStatus;

interface GroupMemberChangeStatusMessageStatus {
    readonly type: 'group-member-change';
    readonly added: IdentityString[];
    readonly removed: IdentityString[];
}

interface GroupNameChangeStatusMessageStatus {
    readonly type: 'group-name-change';
    readonly oldName: string;
    readonly newName: string;
}
