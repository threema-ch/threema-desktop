import * as v from '@badrap/valita';
import {byteJoin} from '@threema/ts-utils/byte/byte-join';
import {bytesLeToU16} from '@threema/ts-utils/conversion/bytes-le-to-u16';
import {u16ToBytesLe} from '@threema/ts-utils/conversion/u16-to-bytes-le';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {ensureEncryptedDataWithNonceAhead} from '~/common/crypto';
import {
    OuterKeyStorageV2,
    OuterKeyStorage_Version,
} from '~/common/internal-protobuf/key-storage-file';
import {KeyStorageError, type KeyStorageVersionPrefixMarked} from '~/common/key-storage/common';
import type {KeyStorageLayerEncodingHelpers} from '~/common/key-storage/layers/common';
import {ARGON2ID_PARAMETERS_SCHEMA} from '~/common/key-storage/layers/outer/common';
import {instanceOf} from '~/common/utils/valita-helpers';

// Encoding

/**
 * Branded type that represents the encoded bytes of an {@link OuterKeyStorageV2} as stored on disk.
 *
 * Important: Prefixed with `u16-le(version)`, as per spec.
 */
export type EncodedOuterKeyStorageV2Bytes = WeakOpaque<
    Uint8Array,
    {readonly EncodedOuterKeyStorageV2Bytes: unique symbol}
> &
    KeyStorageVersionPrefixMarked;

// Validation

/**
 * Validation schema for the {@link OuterKeyStorageV2} contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @throws {ValitaError} In case validation fails.
 */
const OUTER_KEY_STORAGE_V2_SCHEMA = v
    .object({
        // Encrypted intermediate key storage.
        encryptedIntermediate: instanceOf(Uint8Array).map(ensureEncryptedDataWithNonceAhead),
        // KDF parameters.
        kdfParameters: v
            .object({
                $case: v.literal('argon2id'),
                argon2id: ARGON2ID_PARAMETERS_SCHEMA,
            })
            .rest(v.unknown()),
    })
    .rest(v.unknown());

/**
 * Validated {@link OuterKeyStorageV2} contents.
 *
 * @throws {ValitaError} In case validation fails.
 */
export type ValidatedOuterKeyStorageV2 = Readonly<v.Infer<typeof OUTER_KEY_STORAGE_V2_SCHEMA>>;

// Consumption

/**
 * {@link OuterKeyStorageV2} data intended for external consumption.
 */
export type OuterKeyStorageV2Data = Pick<ValidatedOuterKeyStorageV2, 'kdfParameters'>;

/**
 * Helpers for encoding, decoding, validation, as well as transforming data for external
 * consumption.
 */
export const OUTER_KEY_STORAGE_V2_ENCODING_HELPERS: KeyStorageLayerEncodingHelpers<
    EncodedOuterKeyStorageV2Bytes,
    OuterKeyStorageV2,
    typeof OUTER_KEY_STORAGE_V2_SCHEMA,
    OuterKeyStorageV2Data
> = {
    // Encoded -> Decoded -> Validated -> Consumable.

    encodedToDecoded: (encoded) => {
        try {
            const version = bytesLeToU16(encoded.slice(0, 2));
            if (version !== OuterKeyStorage_Version.V2_0) {
                throw new KeyStorageError(
                    'malformed',
                    `OUTER_KEY_STORAGE_V2_ENCODING_HELPERS: Expected version ${OuterKeyStorage_Version.V2_0} (OuterKeyStorageV2_OuterVersion.V2_0), got ${version}`,
                );
            }

            // Even though it might be inefficient, we create a sliced copy here instead of using
            // subarray to be sure the correct bytes are accessed.
            return OuterKeyStorageV2.decode(encoded.slice(2));
        } catch (error) {
            throw new KeyStorageError(
                'malformed',
                'OUTER_KEY_STORAGE_V2_ENCODING_HELPERS: Failed to decode',
                {
                    from: error,
                },
            );
        }
    },
    decodedToValidated: (decoded) => {
        try {
            return OUTER_KEY_STORAGE_V2_SCHEMA.parse(decoded);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                'OUTER_KEY_STORAGE_V2_ENCODING_HELPERS: Validation failed',
                {
                    from: error,
                },
            );
        }
    },
    validatedToConsumable: (validated) => ({
        kdfParameters: validated.kdfParameters,
    }),

    // Consumable -> Validated -> Decoded -> Encoded.

    consumableToValidated: (current, consumable) => ({
        ...current,
        kdfParameters: consumable.kdfParameters ?? current.kdfParameters,
    }),
    validatedToDecoded: (validated) => ({
        encryptedIntermediate: validated.encryptedIntermediate,
        kdfParameters: {
            $case: 'argon2id',
            argon2id: {
                version: validated.kdfParameters.argon2id.version.toProtobuf(),
                salt: validated.kdfParameters.argon2id.salt,
                memoryBytes: validated.kdfParameters.argon2id.memoryBytes,
                iterations: validated.kdfParameters.argon2id.iterations,
                parallelism: validated.kdfParameters.argon2id.parallelism,
            },
        },
    }),
    decodedToEncoded: (decoded) =>
        byteJoin(
            u16ToBytesLe(OuterKeyStorage_Version.V2_0),
            OuterKeyStorageV2.encode(decoded).finish(),
        ) as EncodedOuterKeyStorageV2Bytes,
};
