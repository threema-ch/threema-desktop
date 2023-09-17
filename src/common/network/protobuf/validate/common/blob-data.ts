import * as v from '@badrap/valita';

import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import {ensureBlobId} from '~/common/network/protocol/blob';
import type {ReadonlyUint8Array} from '~/common/types';
import {instanceOf} from '~/common/utils/valita-helpers';

/** Validates {@link common.BlobData} */
export const SCHEMA = validator(
    common.BlobData,
    v
        .object({
            id: instanceOf(Uint8Array).map(ensureBlobId),
            data: instanceOf<ReadonlyUint8Array>(Uint8Array),
        })
        .rest(v.unknown()),
);

export function serialize(validatedMessage: Type): ProtobufInstanceOf<typeof common.BlobData> {
    const {id, data} = validatedMessage;
    return creator(common.BlobData, {
        id: id as ReadonlyUint8Array as Uint8Array,
        data: data as Uint8Array,
    });
}

export type Type = v.Infer<typeof SCHEMA>;
