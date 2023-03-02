import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {GroupIdentity} from '~/common/network/protobuf/validate/common';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as Group from '~/common/network/protobuf/validate/sync/group';

/** Base schema for an {@link d2d.GroupSync} oneof instance */
const BASE_SCHEMA = {
    create: NULL_OR_UNDEFINED_SCHEMA,
    update: NULL_OR_UNDEFINED_SCHEMA,
    delete: NULL_OR_UNDEFINED_SCHEMA,
};

const SCHEMA_CREATE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('create'),
        create: validator(
            d2d.GroupSync.Create,
            v.object({group: Group.SCHEMA_CREATE}).rest(v.unknown()),
        ),
    })
    .rest(v.unknown());

const SCHEMA_UPDATE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('update'),
        update: validator(
            d2d.GroupSync.Update,
            v.object({group: Group.SCHEMA_UPDATE}).rest(v.unknown()),
        ),
    })
    .rest(v.unknown());

const SCHEMA_DELETE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('delete'),
        delete: validator(
            d2d.GroupSync.Delete,
            v.object({groupIdentity: GroupIdentity.SCHEMA}).rest(v.unknown()),
        ),
    })
    .rest(v.unknown());

export const SCHEMA = validator(
    d2d.GroupSync,
    v.union(SCHEMA_CREATE, SCHEMA_UPDATE, SCHEMA_DELETE),
);
