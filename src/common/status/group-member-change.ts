import * as v from '@badrap/valita';

import type {GroupMemberChangeStatusView} from '~/common/model/types/status';
import {ensureIdentityString} from '~/common/network/types';
import * as proto from '~/common/node/status/status';
import type {StatusMessagesCodec} from '~/common/status';

const GROUP_MEMBER_CHANGE_SCHEMA = v
    .object({
        added: v.array(v.string().map(ensureIdentityString)),
        removed: v.array(v.string().map(ensureIdentityString)),
    })
    .rest(v.unknown());

export type GroupMemberChange = v.Infer<typeof GROUP_MEMBER_CHANGE_SCHEMA>;

export const GROUP_MEMBER_CHANGE_CODEC: StatusMessagesCodec<GroupMemberChangeStatusView> = {
    encode: (status) =>
        proto.GroupMemberChange.encode({
            added: status.added,
            removed: status.removed,
        }).finish(),

    decode: (encoded) => GROUP_MEMBER_CHANGE_SCHEMA.parse(proto.GroupMemberChange.decode(encoded)),
} as const;
