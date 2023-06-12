import * as v from '@badrap/valita';

import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import * as Blob from '~/common/network/protobuf/validate/common/blob';

/** Validates {@link common.Image}. The blob key is optional. */
export const SCHEMA_BLOB_KEY_OPTIONAL = validator(
    common.Image,
    v
        .object({
            type: v.number(),
            blob: Blob.SCHEMA_KEY_OPTIONAL,
        })
        .rest(v.unknown()),
);

/** Validates {@link common.Image}. The blob key is required. */
export const SCHEMA_BLOB_KEY_REQUIRED = validator(
    common.Image,
    v
        .object({
            type: v.number(),
            blob: Blob.SCHEMA_KEY_REQUIRED,
        })
        .rest(v.unknown()),
);

export function serialize(
    validatedMessage: TypeBlobKeyRequired,
): ProtobufInstanceOf<typeof common.Image> {
    const {type, blob} = validatedMessage;
    return creator(common.Image, {
        type,
        blob: Blob.serialize(blob),
    });
}

export type TypeBlobKeyOptional = v.Infer<typeof SCHEMA_BLOB_KEY_OPTIONAL>;
export type TypeBlobKeyRequired = v.Infer<typeof SCHEMA_BLOB_KEY_REQUIRED>;
