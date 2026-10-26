import * as v from '@badrap/valita';
import {bytesLeToU16} from '@threema/ts-utils/conversion/bytes-le-to-u16';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {ensureEncryptedDataWithNonceAhead, type EncryptedDataWithNonceAhead} from '~/common/crypto';
import {
    IntermediateKeyStorage_Version,
    IntermediateKeyStorageV1,
} from '~/common/internal-protobuf/key-storage-file';
import {KeyStorageError, type KeyStorageVersionPrefixMarked} from '~/common/key-storage/common';
import type {KeyStorageLayerEncodingHelpers} from '~/common/key-storage/layers/common';
import {
    ensureBaseUrl,
    ensureRemoteSecretAuthenticationToken,
    ensureRemoteSecretHash,
} from '~/common/network/types';
import {instanceOf} from '~/common/utils/valita-helpers';

// Encryption

/**
 * Branded type that represents encrypted encoded bytes of an {@link IntermediateKeyStorageV1}.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type EncryptedEncodedIntermediateKeyStorageV1Bytes = WeakOpaque<
    EncryptedDataWithNonceAhead,
    {readonly EncryptedEncodedIntermediateKeyStorageV1Bytes: unique symbol}
>;

/**
 * Branded type that represents decrypted encoded bytes of an {@link IntermediateKeyStorageV1}.
 *
 * Important: Prefixed with `u16-le(version)`, as per spec.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type DecryptedEncodedIntermediateKeyStorageV1Bytes = WeakOpaque<
    Uint8Array,
    {readonly DecryptedEncodedIntermediateKeyStorageV1Bytes: unique symbol}
> &
    KeyStorageVersionPrefixMarked;

// Validation

/**
 * Validation schema for the remote-secret-protected inner data within an
 * {@link IntermediateKeyStorageV1}.
 *
 * @deprecated Should only be used for one-time migrations.
 * @throws {ValitaError} In case validation fails.
 */
const INTERMEDIATE_KEY_STORAGE_V1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA = v
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
 * Validated remote-secret-protected inner data within an {@link IntermediateKeyStorageV1}.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type ValidatedIntermediateKeyStorageV1RemoteSecretProtectedInner = Readonly<
    v.Infer<typeof INTERMEDIATE_KEY_STORAGE_V1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA>
>;

/**
 * Validation schema for the {@link IntermediateKeyStorageV1} contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @deprecated Should only be used for one-time migrations.
 * @throws {ValitaError} In case validation fails.
 */
const INTERMEDIATE_KEY_STORAGE_V1_SCHEMA = v
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
                        // eslint-disable-next-line @typescript-eslint/no-deprecated
                        INTERMEDIATE_KEY_STORAGE_V1_REMOTE_SECRET_PROTECTED_INNER_SCHEMA,
                })
                .rest(v.unknown()),
        ),
    })
    .rest(v.unknown());

/**
 * Validated {@link IntermediateKeyStorageV1} contents.
 *
 * @deprecated Should only be used for one-time migrations.
 * @throws {ValitaError} In case validation fails.
 */
export type ValidatedIntermediateKeyStorageV1 = Readonly<
    v.Infer<typeof INTERMEDIATE_KEY_STORAGE_V1_SCHEMA>
>;

// Consumption

/**
 * {@link IntermediateKeyStorageV1} data intended for external consumption.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type IntermediateKeyStorageV1Data = Pick<ValidatedIntermediateKeyStorageV1, never>;

/**
 * Helpers for encoding, decoding, validation, as well as transforming data for external
 * consumption.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export const INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: KeyStorageLayerEncodingHelpers<
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    DecryptedEncodedIntermediateKeyStorageV1Bytes,
    IntermediateKeyStorageV1,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    typeof INTERMEDIATE_KEY_STORAGE_V1_SCHEMA,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    IntermediateKeyStorageV1Data
> = {
    // Encoded -> Decoded -> Validated -> Consumable.

    encodedToDecoded: (encoded) => {
        try {
            const version = bytesLeToU16(encoded.slice(0, 2));
            if (version !== IntermediateKeyStorage_Version.V1_0) {
                throw new KeyStorageError(
                    'malformed',
                    `INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Expected version ${IntermediateKeyStorage_Version.V1_0} (IntermediateKeyStorage_Version.V1_0), got ${version}`,
                );
            }

            // Even though it might be inefficient, we create a sliced copy here instead of using
            // subarray to be sure the correct bytes are accessed.
            return IntermediateKeyStorageV1.decode(encoded.slice(2));
        } catch (error) {
            throw new KeyStorageError(
                'malformed',
                'INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Failed to decode',
                {from: error},
            );
        }
    },
    decodedToValidated: (decoded) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            return INTERMEDIATE_KEY_STORAGE_V1_SCHEMA.parse(decoded);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                'INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Validation failed',
                {from: error},
            );
        }
    },
    // `IntermediateKeyStorageV1` does not have any directly consumable content, because the content
    // is entirely contained in the nested inner key storage. Therefore, return an empty object.
    validatedToConsumable: (validated) => ({}),

    // Consumable -> Validated -> Decoded -> Encoded.

    consumableToValidated: () => {
        throw new KeyStorageError(
            'internal-error',
            'INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Refusing to transform to validated: IntermediateKeyStorageV1 is deprecated and should not be used for encoding anymore',
        );
    },
    validatedToDecoded: () => {
        throw new KeyStorageError(
            'internal-error',
            'INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Refusing to transform to decoded: IntermediateKeyStorageV1 is deprecated and should not be used for encoding anymore',
        );
    },
    decodedToEncoded: () => {
        throw new KeyStorageError(
            'internal-error',
            'INTERMEDIATE_KEY_STORAGE_V1_ENCODING_HELPERS: Refusing to encode: IntermediateKeyStorageV1 is deprecated and should not be used for encoding anymore',
        );
    },
};
