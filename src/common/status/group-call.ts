import * as v from '@badrap/valita';

import type {StatusMessageType} from '~/common/enum';
import * as protobuf from '~/common/internal-protobuf/status-message';
import {createGroupCallId} from '~/common/network/protocol/call/group-call';
import {ensureIdentityString} from '~/common/network/types';
import type {StatusMessagesCodec} from '~/common/status';
import {instanceOf} from '~/common/utils/valita-helpers';

const GROUP_CALL_STARTED_OR_ENDED_SCHEMA = v
    .object({
        callId: instanceOf(Uint8Array).map((bytes) => createGroupCallId(bytes)),
        startedBy: v.string().map(ensureIdentityString),
    })
    .rest(v.unknown());

export const GROUP_CALL_STARTED_CODEC: StatusMessagesCodec<StatusMessageType.GROUP_CALL_STARTED> = {
    encode: (status) =>
        protobuf.GroupCallStarted.encode({
            callId: status.callId.bytes as Uint8Array,
            startedBy: status.startedBy,
        }).finish(),

    decode: (encoded) =>
        GROUP_CALL_STARTED_OR_ENDED_SCHEMA.parse(
            protobuf.GroupCallStarted.decode(encoded as Uint8Array),
        ),
} as const;

export const GROUP_CALL_ENDED_CODEC: StatusMessagesCodec<StatusMessageType.GROUP_CALL_ENDED> = {
    encode: (status) =>
        protobuf.GroupCallEnded.encode({
            callId: status.callId.bytes as Uint8Array,
            startedBy: status.startedBy,
        }).finish(),

    decode: (encoded) =>
        GROUP_CALL_STARTED_OR_ENDED_SCHEMA.parse(
            protobuf.GroupCallEnded.decode(encoded as Uint8Array),
        ),
} as const;
