import * as v from '@badrap/valita';
import Long from 'long';

import {common} from '~/common/network/protobuf/js';
import {type ProtobufInstanceOf, creator, validator} from '~/common/network/protobuf/utils';
import {ensureGroupId, ensureIdentityString} from '~/common/network/types';
import {intoU64, intoUnsignedLong} from '~/common/utils/number';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link common.GroupIdentity} */
export const SCHEMA = validator(
    common.GroupIdentity,
    v
        .object({
            groupId: instanceOf(Long).map(intoU64).map(ensureGroupId),
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
