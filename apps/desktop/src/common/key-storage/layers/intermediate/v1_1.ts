import * as v from '@badrap/valita';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteJoin} from '@threema/ts-utils/byte/byte-join';
import {bytesLeToU16} from '@threema/ts-utils/conversion/bytes-le-to-u16';
import {u16ToBytesLe} from '@threema/ts-utils/conversion/u16-to-bytes-le';
import {u64ToUnsignedLong} from '@threema/ts-utils/conversion/u64-to-unsigned-long';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {ensureEncryptedDataWithNonceAhead, type EncryptedDataWithNonceAhead} from '~/common/crypto';
import {
    IntermediateKeyStorage_Version,
    IntermediateKeyStorageV11,
} from '~/common/internal-protobuf/key-storage-file';
import {KeyStorageError, type KeyStorageVersionPrefixMarked} from '~/common/key-storage/common';
import type {KeyStorageLayerEncodingHelpers} from '~/common/key-storage/layers/common';
import {
    ensureBaseUrl,
    ensureRemoteSecretAuthenticationToken,
    ensureRemoteSecretHash,
} from '~/common/network/types';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

// Encryption

/**
 * Branded type that represents encrypted encoded bytes of an {@link IntermediateKeyStorageV11}.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type EncryptedEncodedIntermediateKeyStorageV1_1Bytes = WeakOpaque<
    EncryptedDataWithNonceAhead,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    {readonly EncryptedEncodedIntermediateKeyStorageV1_1Bytes: unique symbol}
>;

/**
 * Branded type that represents decrypted encoded bytes of an {@link IntermediateKeyStorageV11}.
 *
 * Important: Prefixed with `u16-le(version)`, as per spec.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type DecryptedEncodedIntermediateKeyStorageV1_1Bytes = WeakOpaque<
    Uint8Array,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    {readonly DecryptedEncodedIntermediateKeyStorageV1_1Bytes: unique symbol}
> &
    KeyStorageVersionPrefixMarked;

// Validation

/**
 * Validation schema for the remote-secret-protected inner data within an
 * {@link IntermediateKeyStorageV11}.
 *
 * @throws {ValitaError} In case validation fails.
 */
const INTERMEDIATE_KEY_STORAGE_V1_1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA = v
    .object({
        remoteSecretAuthenticationToken: instanceOf(Uint8Array).map(
            ensureRemoteSecretAuthenticationToken,
        ),
        remoteSecretHash: instanceOf(Uint8Array).map(ensureRemoteSecretHash),
        onPremCachedRemoteSecretEndpointUrl: v.string().map((url) => ensureBaseUrl(url, 'https:')),
        encryptedInner: instanceOf(Uint8Array).map(ensureEncryptedDataWithNonceAhead),
    })
    .rest(v.unknown());

/**
 * Validated remote-secret-protected inner data within an {@link IntermediateKeyStorageV11}.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type ValidatedIntermediateKeyStorageV1_1RemoteSecretProtectedInner = Readonly<
    v.Infer<typeof INTERMEDIATE_KEY_STORAGE_V1_1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA>
>;

/**
 * Validation schema for the {@link IntermediateKeyStorageV11} contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @throws {ValitaError} In case validation fails.
 */
const INTERMEDIATE_KEY_STORAGE_V1_1_SCHEMA = v
    .object({
        inner: v.union(
            v
                .object({
                    $case: v.literal('plaintextInner'),
                    plaintextInner: instanceOf(Uint8Array),
                })
                .rest(v.unknown()),
            v
                .object({
                    $case: v.literal('remoteSecretProtectedInner'),
                    remoteSecretProtectedInner:
                        INTERMEDIATE_KEY_STORAGE_V1_1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA,
                })
                .rest(v.unknown()),
        ),
        workCredentials: v
            .object({username: v.string(), password: v.string()})
            .rest(v.unknown())
            .optional(),
        onPremConfig: v
            .object({
                oppfUrl: v.string(),
                oppfCachedConfig: v.string(),
                lastUpdated: unsignedLongAsU64(),
            })
            .rest(v.unknown())
            .optional(),
    })
    .rest(v.unknown());

/**
 * Validated {@link IntermediateKeyStorageV11} contents.
 *
 * @throws {ValitaError} In case validation fails.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type ValidatedIntermediateKeyStorageV1_1 = Readonly<
    v.Infer<typeof INTERMEDIATE_KEY_STORAGE_V1_1_SCHEMA>
>;

// Consumption

/**
 * {@link IntermediateKeyStorageV11} data intended for external consumption.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export type IntermediateKeyStorageV1_1Data = Pick<
    ValidatedIntermediateKeyStorageV1_1,
    'workCredentials' | 'onPremConfig'
>;

/**
 * Helpers for encoding, decoding, validation, as well as transforming data for external
 * consumption.
 */
export const INTERMEDIATE_KEY_STORAGE_V1_1_ENCODING_HELPERS: KeyStorageLayerEncodingHelpers<
    DecryptedEncodedIntermediateKeyStorageV1_1Bytes,
    IntermediateKeyStorageV11,
    typeof INTERMEDIATE_KEY_STORAGE_V1_1_SCHEMA,
    IntermediateKeyStorageV1_1Data
> = {
    // Encoded -> Decoded -> Validated -> Consumable.

    encodedToDecoded: (encoded) => {
        try {
            const version = bytesLeToU16(encoded.slice(0, 2));
            if (version !== IntermediateKeyStorage_Version.V1_1) {
                throw new KeyStorageError(
                    'malformed',
                    `INTERMEDIATE_KEY_STORAGE_V1_1_ENCODING_HELPERS: Expected version ${IntermediateKeyStorage_Version.V1_1} (IntermediateKeyStorage_Version.V1_1), got ${version}`,
                );
            }

            // Even though it might be inefficient, we create a sliced copy here instead of using
            // subarray to be sure the correct bytes are accessed.
            return IntermediateKeyStorageV11.decode(encoded.slice(2));
        } catch (error) {
            throw new KeyStorageError(
                'malformed',
                'INTERMEDIATE_KEY_STORAGE_V1_1_ENCODING_HELPERS: Failed to decode',
                {from: error},
            );
        }
    },
    decodedToValidated: (decoded) => {
        try {
            return INTERMEDIATE_KEY_STORAGE_V1_1_SCHEMA.parse(decoded);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                'INTERMEDIATE_KEY_STORAGE_V1_1_ENCODING_HELPERS: Validation failed',
                {from: error},
            );
        }
    },
    validatedToConsumable: (validated) => ({
        workCredentials: validated.workCredentials,
        onPremConfig: validated.onPremConfig,
    }),

    // Consumable -> Validated -> Decoded -> Encoded.

    consumableToValidated: (current, consumable) => ({
        ...current,
        workCredentials: consumable.workCredentials ?? current.workCredentials,
        onPremConfig: consumable.onPremConfig ?? current.onPremConfig,
    }),
    validatedToDecoded: (validated) => {
        const {inner} = validated;
        let decodedInner: IntermediateKeyStorageV11['inner'];
        switch (inner.$case) {
            case 'plaintextInner':
                decodedInner = {$case: 'plaintextInner', plaintextInner: inner.plaintextInner};
                break;

            case 'remoteSecretProtectedInner': {
                const {remoteSecretProtectedInner} = inner;
                decodedInner = {
                    $case: 'remoteSecretProtectedInner',
                    remoteSecretProtectedInner: {
                        remoteSecretAuthenticationToken:
                            remoteSecretProtectedInner.remoteSecretAuthenticationToken as ReadonlyUint8Array as Uint8Array,
                        remoteSecretHash:
                            remoteSecretProtectedInner.remoteSecretHash as ReadonlyUint8Array as Uint8Array,
                        onPremCachedRemoteSecretEndpointUrl:
                            remoteSecretProtectedInner.onPremCachedRemoteSecretEndpointUrl.toString(),
                        encryptedInner: remoteSecretProtectedInner.encryptedInner,
                    },
                };
                break;
            }

            default:
                throw new KeyStorageError(
                    'internal-error',
                    `INTERMEDIATE_KEY_STORAGE_V1_1_ENCODING_HELPERS: Unexpected inner case`,
                );
        }

        return {
            inner: decodedInner,
            workCredentials:
                validated.workCredentials === undefined
                    ? undefined
                    : {
                          username: validated.workCredentials.username,
                          password: validated.workCredentials.password,
                      },
            onPremConfig:
                validated.onPremConfig === undefined
                    ? undefined
                    : {
                          oppfUrl: validated.onPremConfig.oppfUrl,
                          oppfCachedConfig: validated.onPremConfig.oppfCachedConfig,
                          lastUpdated: u64ToUnsignedLong(validated.onPremConfig.lastUpdated),
                      },
        };
    },
    decodedToEncoded: (decoded) =>
        byteJoin(
            u16ToBytesLe(IntermediateKeyStorage_Version.V1_1),
            IntermediateKeyStorageV11.encode(decoded).finish(),
        ) as DecryptedEncodedIntermediateKeyStorageV1_1Bytes,
};
