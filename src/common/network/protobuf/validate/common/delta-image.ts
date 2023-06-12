import * as v from '@badrap/valita';

import {UNIT_MESSAGE} from '~/common/network/protobuf';
import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import * as Image from '~/common/network/protobuf/validate/common/image';
import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';

/** Base schema for an {@link common.DeltaImage} oneof instance */
const BASE_SCHEMA = {
    removed: NULL_OR_UNDEFINED_SCHEMA,
    updated: NULL_OR_UNDEFINED_SCHEMA,
};

const SCHEMA_REMOVED = v
    .object({
        ...BASE_SCHEMA,
        image: v.literal('removed'),
        removed: Unit.SCHEMA,
    })
    .rest(v.unknown());

export const SCHEMA_UPDATED_BLOB_KEY_OPTIONAL = v
    .object({
        ...BASE_SCHEMA,
        image: v.literal('updated'),
        updated: Image.SCHEMA_BLOB_KEY_OPTIONAL,
    })
    .rest(v.unknown());

const SCHEMA_UPDATED_BLOB_KEY_REQUIRED = v
    .object({
        ...BASE_SCHEMA,
        image: v.literal('updated'),
        updated: Image.SCHEMA_BLOB_KEY_REQUIRED,
    })
    .rest(v.unknown());

/**
 * Validates {@link common.DeltaImage} in the context of an image update (e.g. user profile picture
 * sync). The contained blob key is required.
 **/
export const SCHEMA = validator(
    common.DeltaImage,
    v.union(SCHEMA_REMOVED, SCHEMA_UPDATED_BLOB_KEY_REQUIRED),
);

export function serializeRemoved(): ProtobufInstanceOf<typeof common.DeltaImage> {
    return creator(common.DeltaImage, {
        removed: UNIT_MESSAGE,
        updated: undefined,
    });
}

export function serializeUpdated(
    image: Image.TypeBlobKeyRequired,
): ProtobufInstanceOf<typeof common.DeltaImage> {
    return creator(common.DeltaImage, {
        removed: undefined,
        updated: Image.serialize(image),
    });
}

export type Type = v.Infer<typeof SCHEMA>;
