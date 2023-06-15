import * as v from '@badrap/valita';

import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import {ensureGroupId, ensureIdentityString} from '~/common/network/types';
import {intoUnsignedLong} from '~/common/utils/number';
import {unsignedLongAsU64} from '~/common/utils/valita-helpers';

/** Validates {@link common.GroupIdentity} */
export const SCHEMA = validator(
    common.GroupIdentity,
    v
        .object({
            groupId: unsignedLongAsU64().map(ensureGroupId),
            creatorIdentity: v.string().map(ensureIdentityString),
        })
        .rest(v.unknown()),
);

export function serialize(validatedMessage: Type): ProtobufInstanceOf<typeof common.GroupIdentity> {
    const {creatorIdentity, groupId} = validatedMessage;
    return creator(common.GroupIdentity, {
        creatorIdentity,
        groupId: intoUnsignedLong(groupId),
    });
}

export type Type = v.Infer<typeof SCHEMA>;
