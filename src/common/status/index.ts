import {StatusMessageType} from '~/common/enum';
import type {StatusMessageValues} from '~/common/model/types/status';
import {CHAT_RESTORED_CODEC} from '~/common/status/chat-restored';
import {GROUP_CALL_STARTED_CODEC, GROUP_CALL_ENDED_CODEC} from '~/common/status/group-call';
import {GROUP_MEMBER_CHANGED_CODEC} from '~/common/status/group-member-changed';
import {GROUP_NAME_CHANGED_CODEC} from '~/common/status/group-name-changed';
import {GROUP_USER_STATE_CHANGED_CODEC} from '~/common/status/group-user-state-changed';
import type {ReadonlyUint8Array} from '~/common/types';

export interface StatusMessagesCodec<TType extends StatusMessageType> {
    readonly encode: (status: StatusMessageValues[TType]) => Uint8Array;
    readonly decode: (encoded: ReadonlyUint8Array) => StatusMessageValues[TType];
}

/** Map of the status types to their corresponding codec. */
export const STATUS_CODEC: {
    readonly [TType in StatusMessageType]: StatusMessagesCodec<TType>;
} = {
    [StatusMessageType.CHAT_RESTORED]: CHAT_RESTORED_CODEC,
    [StatusMessageType.GROUP_MEMBER_CHANGED]: GROUP_MEMBER_CHANGED_CODEC,
    [StatusMessageType.GROUP_NAME_CHANGED]: GROUP_NAME_CHANGED_CODEC,
    [StatusMessageType.GROUP_CALL_STARTED]: GROUP_CALL_STARTED_CODEC,
    [StatusMessageType.GROUP_CALL_ENDED]: GROUP_CALL_ENDED_CODEC,
    [StatusMessageType.GROUP_USER_STATE_CHANGED]: GROUP_USER_STATE_CHANGED_CODEC,
};
