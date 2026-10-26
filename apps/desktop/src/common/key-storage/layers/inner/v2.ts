import * as v from '@badrap/valita';
import {bytesLeToU16} from '@threema/ts-utils/conversion/bytes-le-to-u16';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import type {EncryptedDataWithNonceAhead} from '~/common/crypto';
import {wrapRawDatabaseKey} from '~/common/db';
import {
    InnerKeyStorage_Version,
    InnerKeyStorageV2,
} from '~/common/internal-protobuf/key-storage-file';
import {KeyStorageError, type KeyStorageVersionPrefixMarked} from '~/common/key-storage/common';
import type {KeyStorageLayerEncodingHelpers} from '~/common/key-storage/layers/common';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureDeviceCookie,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

// Encryption

/**
 * Branded type that represents encrypted encoded bytes of an {@link InnerKeyStorageV2}.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type RemoteSecretEncryptedEncodedInnerKeyStorageV2Bytes = WeakOpaque<
    EncryptedDataWithNonceAhead,
    {readonly EncryptedEncodedInnerKeyStorageV2Bytes: unique symbol}
>;

/**
 * Branded type that represents plaintext (or decrypted) encoded bytes of an
 * {@link InnerKeyStorageV2}.
 *
 * Important: Prefixed with `u16-le(version)`, as per spec.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type DecryptedEncodedInnerKeyStorageV2Bytes = WeakOpaque<
    Uint8Array,
    {readonly DecryptedEncodedInnerKeyStorageV2Bytes: unique symbol}
> &
    KeyStorageVersionPrefixMarked;

// Validation

/**
 * Validation schema for the {@link InnerKeyStorageV2} contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @deprecated Should only be used for one-time migrations.
 * @throws {ValitaError} In case validation fails.
 */
const INNER_KEY_STORAGE_V2_SCHEMA = v
    .object({
        // Identity related information.
        identityData: v
            .object({
                identity: v.string().map(ensureIdentityString),
                ck: instanceOf(Uint8Array).map(wrapRawClientKey),
                serverGroup: v.string().map(ensureServerGroup),
            })
            .rest(v.unknown()),
        dgk: instanceOf(Uint8Array).map(wrapRawDeviceGroupKey),
        databaseKey: instanceOf(Uint8Array).map(wrapRawDatabaseKey),
        deviceIds: v
            .object({
                d2mDeviceId: unsignedLongAsU64().map(ensureD2mDeviceId),
                cspDeviceId: unsignedLongAsU64().map(ensureCspDeviceId),
            })
            .rest(v.unknown()),
        deviceCookie: instanceOf(Uint8Array).map(ensureDeviceCookie),
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
 * Validated {@link InnerKeyStorageV2} contents.
 *
 * @deprecated Should only be used for one-time migrations.
 * @throws {ValitaError} In case validation fails.
 */
export type ValidatedInnerKeyStorageV2 = Readonly<v.Infer<typeof INNER_KEY_STORAGE_V2_SCHEMA>>;

// Consumption

/**
 * {@link InnerKeyStorageV2} data intended for external consumption.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export type InnerKeyStorageV2Data = Pick<
    ValidatedInnerKeyStorageV2,
    | 'identityData'
    | 'dgk'
    | 'databaseKey'
    | 'deviceIds'
    | 'deviceCookie'
    | 'workCredentials'
    | 'onPremConfig'
>;

/**
 * Helpers for encoding, decoding, validation, as well as transforming data for external
 * consumption.
 *
 * @deprecated Should only be used for one-time migrations.
 */
export const INNER_KEY_STORAGE_V2_ENCODING_HELPERS: KeyStorageLayerEncodingHelpers<
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    DecryptedEncodedInnerKeyStorageV2Bytes,
    InnerKeyStorageV2,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    typeof INNER_KEY_STORAGE_V2_SCHEMA,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    InnerKeyStorageV2Data
> = {
    // Encoded -> Decoded -> Validated -> Consumable.

    encodedToDecoded: (encoded) => {
        try {
            const version = bytesLeToU16(encoded.slice(0, 2));
            if (version !== InnerKeyStorage_Version.V2_0) {
                throw new KeyStorageError(
                    'malformed',
                    `INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Expected version ${InnerKeyStorage_Version.V2_0} (InnerKeyStorage_Version.V2_0), got ${version}`,
                );
            }

            // Even though it might be inefficient, we create a sliced copy here instead of using
            // subarray to be sure the correct bytes are accessed.
            return InnerKeyStorageV2.decode(encoded.slice(2));
        } catch (error) {
            throw new KeyStorageError(
                'malformed',
                'INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Failed to decode',
                {
                    from: error,
                },
            );
        }
    },
    decodedToValidated: (decoded) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            return INNER_KEY_STORAGE_V2_SCHEMA.parse(decoded);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                'INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Validation failed',
                {
                    from: error,
                },
            );
        }
    },
    validatedToConsumable: (validated) => ({
        identityData: validated.identityData,
        dgk: validated.dgk,
        databaseKey: validated.databaseKey,
        deviceIds: validated.deviceIds,
        deviceCookie: validated.deviceCookie,
        workCredentials: validated.workCredentials,
        onPremConfig: validated.onPremConfig,
    }),

    // Consumable -> Validated -> Decoded -> Encoded.

    consumableToValidated: () => {
        throw new KeyStorageError(
            'internal-error',
            'INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Refusing to transform to validated: InnerKeyStorageV2 is deprecated and should not be used for encoding anymore',
        );
    },
    validatedToDecoded: () => {
        throw new KeyStorageError(
            'internal-error',
            'INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Refusing to transform to decoded: InnerKeyStorageV2 is deprecated and should not be used for encoding anymore',
        );
    },
    decodedToEncoded: () => {
        throw new KeyStorageError(
            'internal-error',
            'INNER_KEY_STORAGE_V2_ENCODING_HELPERS: Refusing to encode: InnerKeyStorageV2 is deprecated and should not be used for encoding anymore',
        );
    },
};
