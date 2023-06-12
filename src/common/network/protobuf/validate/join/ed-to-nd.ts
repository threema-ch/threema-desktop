import * as v from '@badrap/valita';

import {join} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as BlobData from '~/common/network/protobuf/validate/common/blob-data';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as EssentialData from '~/common/network/protobuf/validate/join/essential-data';

/** Base schema for an {@link join.EdToNd} oneof instance */
const BASE_SCHEMA = {
    begin: NULL_OR_UNDEFINED_SCHEMA,
    blobData: NULL_OR_UNDEFINED_SCHEMA,
    essentialData: NULL_OR_UNDEFINED_SCHEMA,
};

const SCHEMA_BEGIN = v
    .object({
        ...BASE_SCHEMA,
        content: v.literal('begin'),
        begin: validator(join.Begin, v.object({}).rest(v.unknown())),
    })
    .rest(v.unknown());

const SCHEMA_BLOB_DATA = v
    .object({
        ...BASE_SCHEMA,
        content: v.literal('blobData'),
        blobData: BlobData.SCHEMA,
    })
    .rest(v.unknown());

const SCHEMA_ESSENTIAL_DATA = v
    .object({
        ...BASE_SCHEMA,
        content: v.literal('essentialData'),
        essentialData: EssentialData.SCHEMA,
    })
    .rest(v.unknown());

export const SCHEMA = validator(
    join.EdToNd,
    v.union(SCHEMA_BEGIN, SCHEMA_BLOB_DATA, SCHEMA_ESSENTIAL_DATA),
);
export type Type = v.Infer<typeof SCHEMA>;
