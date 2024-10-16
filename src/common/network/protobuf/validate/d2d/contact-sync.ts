import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as Contact from '~/common/network/protobuf/validate/sync/contact';

/** Base schema for an {@link d2d.ContactSync} oneof instance */
const BASE_SCHEMA = {
    create: NULL_OR_UNDEFINED_SCHEMA,
    update: NULL_OR_UNDEFINED_SCHEMA,
    delete: NULL_OR_UNDEFINED_SCHEMA,
};

const SCHEMA_CREATE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('create'),
        create: validator(d2d.ContactSync.Create, v.object({contact: Contact.SCHEMA_CREATE})),
    })
    .rest(v.unknown());

const SCHEMA_UPDATE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('update'),
        update: validator(d2d.ContactSync.Update, v.object({contact: Contact.SCHEMA_UPDATE})),
    })
    .rest(v.unknown());

export const SCHEMA = validator(d2d.ContactSync, v.union(SCHEMA_CREATE, SCHEMA_UPDATE));
export type Type = v.Infer<typeof SCHEMA>;
