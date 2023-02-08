import * as v from '@badrap/valita';

import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import * as Blob from '~/common/network/protobuf/validate/common/blob';

/** Validates {@link common.Image} */
export const SCHEMA = validator(
    common.Image,
    v
        .object({
            type: v.number(),
            blob: Blob.SCHEMA_KEY_REQUIRED,
        })
        .rest(v.unknown()),
);

export function serialize(validatedMessage: Type): ProtobufInstanceOf<typeof common.Image> {
    const {type, blob} = validatedMessage;
    return creator(common.Image, {
        type,
        blob: Blob.serialize(blob),
    });
}

export type Type = v.Infer<typeof SCHEMA>;
