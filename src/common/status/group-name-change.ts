import * as v from '@badrap/valita';

import type {GroupNameChangeStatus} from '~/common/model/types/status';
import * as proto from '~/common/node/status/status';
import type {StatusMessagesCodec} from '~/common/status';

const GROUP_NAME_CHANGE = v
    .object({
        oldName: v.string(),
        newName: v.string(),
    })
    .rest(v.unknown());

export type GroupNameChange = v.Infer<typeof GROUP_NAME_CHANGE>;

export const GROUP_NAME_CHANGE_CODEC: StatusMessagesCodec<GroupNameChangeStatus> = {
    encode: (status) =>
        proto.GroupNameChange.encode({
            oldName: status.oldName,
            newName: status.newName,
        }).finish(),

    decode: (encoded) => GROUP_NAME_CHANGE.parse(proto.GroupNameChange.decode(encoded)),
} as const;
