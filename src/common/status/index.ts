import type {StatusMessageType} from '~/common/enum';
import type {
    AnyStatusMessageModel,
    GroupMemberChangeStatus,
    GroupNameChangeStatus,
} from '~/common/model/types/status';
import {GROUP_MEMBER_CHANGE_CODEC} from '~/common/status/group-member-change';
import {GROUP_NAME_CHANGE_CODEC} from '~/common/status/group-name-change';

export interface StatusMessagesCodec<TStatusModel extends AnyStatusMessageModel> {
    readonly encode: (status: TStatusModel['view']['value']) => Uint8Array;
    readonly decode: (encoded: Uint8Array) => TStatusModel['view']['value'];
}

// Map the status types to their corresponding codecs.
// Note: This must cover all implemented status messages.
export type StatusMessageTypesCodec = {
    readonly [TKey in StatusMessageType]: TKey extends 'group-member-change'
        ? StatusMessagesCodec<GroupMemberChangeStatus>
        : TKey extends 'group-name-change'
          ? StatusMessagesCodec<GroupNameChangeStatus>
          : never;
};

export const STATUS_CODEC: StatusMessageTypesCodec = {
    'group-member-change': GROUP_MEMBER_CHANGE_CODEC,
    'group-name-change': GROUP_NAME_CHANGE_CODEC,
};
