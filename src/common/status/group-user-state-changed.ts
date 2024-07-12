import * as v from '@badrap/valita';

import {GroupUserStateUtils, type StatusMessageType} from '~/common/enum';
import * as protobuf from '~/common/internal-protobuf/status-message';
import type {StatusMessagesCodec} from '~/common/status';

const GROUP_USER_STATE_CHANGED_SCHEMA = v
    .object({
        newUserState: v.number().map((state) => GroupUserStateUtils.fromNumber(state)),
    })
    .rest(v.unknown());

export const GROUP_USER_STATE_CHANGED_CODEC: StatusMessagesCodec<StatusMessageType.GROUP_USER_STATE_CHANGED> =
    {
        encode: (status) => protobuf.GroupUserStateChange.encode(status).finish(),
        decode: (encoded) =>
            GROUP_USER_STATE_CHANGED_SCHEMA.parse(
                protobuf.GroupUserStateChange.decode(encoded as Uint8Array),
            ),
    } as const;
