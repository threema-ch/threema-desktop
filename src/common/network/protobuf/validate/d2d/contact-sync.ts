import * as v from '@badrap/valita';

import {d2d} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as Contact from '~/common/network/protobuf/validate/sync/contact';
import {ensureIdentityString} from '~/common/network/types';

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

// TODO(DESK-1646) Remove this
// We keep this to be able to handle iOS versions < 6.3 where contact deletion still results in a
// contactSync.Delete message.
const SCHEMA_DELETE = v
    .object({
        ...BASE_SCHEMA,
        action: v.literal('delete'),
        delete: validator(
            d2d.ContactSync.Delete,
            v.object({deleteIdentity: v.string().map(ensureIdentityString)}),
        ),
    })
    .rest(v.unknown());

export const SCHEMA = validator(
    d2d.ContactSync,
    v.union(SCHEMA_CREATE, SCHEMA_UPDATE, SCHEMA_DELETE),
);
export type Type = v.Infer<typeof SCHEMA>;
