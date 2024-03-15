import type {StatusMessageType} from '~/common/enum';
import type {
    AnyStatusMessage,
    GroupMemberChangeStatusView,
    GroupNameChangeView,
} from '~/common/model/types/status';
import {GROUP_MEMBER_CHANGE_CODEC} from '~/common/status/group-member-change';
import {GROUP_NAME_CHANGE_CODEC} from '~/common/status/group-name-change';

export interface StatusMessagesCodec<TStatus extends AnyStatusMessage> {
    readonly encode: (status: TStatus['value']) => Uint8Array;
    readonly decode: (encoded: Uint8Array) => TStatus['value'];
}

// Map the status types to their corresponding codecs.
// Note: This must represent with all implemented status messages.
export type StatusMessageTypesCodec = {
    readonly [TKey in StatusMessageType]: TKey extends 'group-member-change'
        ? StatusMessagesCodec<GroupMemberChangeStatusView>
        : TKey extends 'group-name-change'
          ? StatusMessagesCodec<GroupNameChangeView>
          : never;
};

export const STATUS_CODEC: StatusMessageTypesCodec = {
    'group-member-change': GROUP_MEMBER_CHANGE_CODEC,
    'group-name-change': GROUP_NAME_CHANGE_CODEC,
};
