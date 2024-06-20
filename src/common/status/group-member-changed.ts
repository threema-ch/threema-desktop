import * as v from '@badrap/valita';

import type {StatusMessageType} from '~/common/enum';
import * as protobuf from '~/common/internal-protobuf/status-message';
import {ensureIdentityString} from '~/common/network/types';
import type {StatusMessagesCodec} from '~/common/status';

const GROUP_MEMBER_CHANGED_SCHEMA = v
    .object({
        added: v.array(v.string().map(ensureIdentityString)),
        removed: v.array(v.string().map(ensureIdentityString)),
    })
    .rest(v.unknown());

export const GROUP_MEMBER_CHANGED_CODEC: StatusMessagesCodec<StatusMessageType.GROUP_MEMBER_CHANGED> =
    {
        encode: (status) => protobuf.GroupMemberChanged.encode(status).finish(),
        decode: (encoded) =>
            GROUP_MEMBER_CHANGED_SCHEMA.parse(
                protobuf.GroupMemberChanged.decode(encoded as Uint8Array),
            ),
    } as const;
