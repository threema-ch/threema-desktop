import * as v from '@badrap/valita';

import {ensureNonce} from '~/common/crypto';
import {common} from '~/common/network/protobuf/js';
import {creator, type ProtobufInstanceOf, validator} from '~/common/network/protobuf/utils';
import {ensureBlobId} from '~/common/network/protocol/blob';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array} from '~/common/types';
import {
    dateToUnixTimestampMs,
    intoUnsignedLong,
    unixTimestampToDateMs,
} from '~/common/utils/number';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

// Note: In the protobuf definitions, the key is optional, but there are use cases where a key must
// be required. Thus, we have two schemata and two types.

const BASE_SCHEMA = {
    id: instanceOf(Uint8Array).map(ensureBlobId),
    nonce: instanceOf(Uint8Array)
        .map((bytes) => (bytes.byteLength === 0 ? undefined : ensureNonce(bytes)))
        .optional(),
    uploadedAt: unsignedLongAsU64()
        .map((val) => (val === 0n ? undefined : unixTimestampToDateMs(val)))
        .optional(),
};

/** Validates {@link common.Blob} with the key optional. */
export const SCHEMA_KEY_OPTIONAL = validator(
    common.Blob,
    v
        .object({
            ...BASE_SCHEMA,
            key: instanceOf(Uint8Array)
                .map((bytes) => (bytes.byteLength === 0 ? undefined : wrapRawBlobKey(bytes)))
                .optional(),
        })
        .rest(v.unknown()),
);

/** Validates {@link common.Blob} with the key required. */
export const SCHEMA_KEY_REQUIRED = validator(
    common.Blob,
    v
        .object({
            ...BASE_SCHEMA,
            key: instanceOf(Uint8Array).chain((bytes) => {
                if (bytes.byteLength === 0) {
                    return v.err('Expected 32-byte blob key, but found 0 bytes');
                }
                try {
                    return v.ok(wrapRawBlobKey(bytes));
                } catch (error) {
                    return v.err(`Invalid blob key: ${error}`);
                }
            }),
        })
        .rest(v.unknown()),
);

export function serialize(
    validatedMessage: TypeKeyOptional,
): ProtobufInstanceOf<typeof common.Blob> {
    const {id, key, nonce, uploadedAt} = validatedMessage;
    return creator(common.Blob, {
        id: id as ReadonlyUint8Array as Uint8Array,
        key: key === undefined ? undefined : (key.unwrap() as ReadonlyUint8Array as Uint8Array),
        nonce: nonce as Uint8Array | undefined,
        uploadedAt:
            uploadedAt === undefined
                ? undefined
                : intoUnsignedLong(dateToUnixTimestampMs(uploadedAt)),
    });
}

export type TypeKeyOptional = v.Infer<typeof SCHEMA_KEY_OPTIONAL>;
export type TypeKeyRequired = v.Infer<typeof SCHEMA_KEY_REQUIRED>;
