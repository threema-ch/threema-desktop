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

const SCHEMA_UPDATED = v
    .object({
        ...BASE_SCHEMA,
        image: v.literal('updated'),
        updated: Image.SCHEMA,
    })
    .rest(v.unknown());

/** Validates {@link common.DeltaImage} */
export const SCHEMA = validator(common.DeltaImage, v.union(SCHEMA_REMOVED, SCHEMA_UPDATED));

export function serializeRemoved(): ProtobufInstanceOf<typeof common.DeltaImage> {
    return creator(common.DeltaImage, {
        removed: UNIT_MESSAGE,
        updated: undefined,
    });
}

export function serializeUpdated(image: Image.Type): ProtobufInstanceOf<typeof common.DeltaImage> {
    return creator(common.DeltaImage, {
        removed: undefined,
        updated: Image.serialize(image),
    });
}

export type Type = v.Infer<typeof SCHEMA>;
