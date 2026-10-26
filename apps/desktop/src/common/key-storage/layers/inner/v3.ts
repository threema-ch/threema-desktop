import * as v from '@badrap/valita';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {byteJoin} from '@threema/ts-utils/byte/byte-join';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';
import {bytesLeToU16} from '@threema/ts-utils/number/bytes-le-to-u16';
import {u64ToUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {u16ToBytesLe} from '@threema/ts-utils/number/u16-to-bytes-le';

import type {EncryptedDataWithNonceAhead} from '~/common/crypto';
import {wrapRawDatabaseKey} from '~/common/db';
import {
    InnerKeyStorage_Version,
    InnerKeyStorageV3,
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
 * Branded type that represents encrypted encoded bytes of an {@link InnerKeyStorageV3}.
 */
export type RemoteSecretEncryptedEncodedInnerKeyStorageV3Bytes = WeakOpaque<
    EncryptedDataWithNonceAhead,
    {readonly EncryptedEncodedInnerKeyStorageV3Bytes: unique symbol}
>;

/**
 * Branded type that represents plaintext (or decrypted) encoded bytes of an
 * {@link InnerKeyStorageV3}.
 *
 * Important: Prefixed with `u16-le(version)`, as per spec.
 */
export type DecryptedEncodedInnerKeyStorageV3Bytes = WeakOpaque<
    Uint8Array,
    {readonly DecryptedEncodedInnerKeyStorageV3Bytes: unique symbol}
> &
    KeyStorageVersionPrefixMarked;

// Validation

/**
 * Validation schema for the {@link InnerKeyStorageV3} contents.
 *
 * Note: It's important that all objects are annotated with `.rest(v.unknown())` to ensure forwards
 * compatibility!
 *
 * @throws {ValitaError} In case validation fails.
 */
const INNER_KEY_STORAGE_V3_SCHEMA = v
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
    })
    .rest(v.unknown());

/**
 * Validated {@link InnerKeyStorageV3} contents.
 *
 * @throws {ValitaError} In case validation fails.
 */
export type ValidatedInnerKeyStorageV3 = Readonly<v.Infer<typeof INNER_KEY_STORAGE_V3_SCHEMA>>;

// Consumption

/**
 * {@link InnerKeyStorageV3} data intended for external consumption.
 */
export type InnerKeyStorageV3Data = Pick<
    ValidatedInnerKeyStorageV3,
    'identityData' | 'dgk' | 'databaseKey' | 'deviceIds' | 'deviceCookie'
>;

/**
 * Helpers for encoding, decoding, validation, as well as transforming data for external
 * consumption.
 */
export const INNER_KEY_STORAGE_V3_ENCODING_HELPERS: KeyStorageLayerEncodingHelpers<
    DecryptedEncodedInnerKeyStorageV3Bytes,
    InnerKeyStorageV3,
    typeof INNER_KEY_STORAGE_V3_SCHEMA,
    InnerKeyStorageV3Data
> = {
    // Encoded -> Decoded -> Validated -> Consumable.

    encodedToDecoded: (encoded) => {
        try {
            const version = bytesLeToU16(encoded.slice(0, 2));
            if (version !== InnerKeyStorage_Version.V3_0) {
                throw new KeyStorageError(
                    'malformed',
                    `INNER_KEY_STORAGE_V3_ENCODING_HELPERS: Expected version ${InnerKeyStorage_Version.V3_0} (InnerKeyStorage_Version.V3_0), got ${version}`,
                );
            }

            // Even though it might be inefficient, we create a sliced copy here instead of using
            // subarray to be sure the correct bytes are accessed.
            return InnerKeyStorageV3.decode(encoded.slice(2));
        } catch (error) {
            throw new KeyStorageError(
                'malformed',
                'INNER_KEY_STORAGE_V3_ENCODING_HELPERS: Failed to decode',
                {
                    from: error,
                },
            );
        }
    },
    decodedToValidated: (decoded) => {
        try {
            return INNER_KEY_STORAGE_V3_SCHEMA.parse(decoded);
        } catch (error) {
            throw new KeyStorageError(
                'invalid',
                'INNER_KEY_STORAGE_V3_ENCODING_HELPERS: Validation failed',
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
    }),

    // Consumable -> Validated -> Decoded -> Encoded.

    consumableToValidated: (current, consumable) => ({
        ...current,
        identityData: consumable.identityData ?? current.identityData,
        dgk: consumable.dgk ?? current.dgk,
        databaseKey: consumable.databaseKey ?? current.databaseKey,
        deviceIds: consumable.deviceIds ?? current.deviceIds,
        deviceCookie: consumable.deviceCookie ?? current.deviceCookie,
    }),
    validatedToDecoded: (validated) => ({
        identityData: {
            identity: validated.identityData.identity,
            ck: validated.identityData.ck.unwrap(),
            serverGroup: validated.identityData.serverGroup,
        },
        dgk: validated.dgk.unwrap(),
        databaseKey: validated.databaseKey.unwrap(),
        deviceIds: {
            d2mDeviceId: u64ToUnsignedLong(validated.deviceIds.d2mDeviceId),
            cspDeviceId: u64ToUnsignedLong(validated.deviceIds.cspDeviceId),
        },
        deviceCookie: validated.deviceCookie as ReadonlyUint8Array as Uint8Array,
    }),
    decodedToEncoded: (decoded) =>
        byteJoin(
            u16ToBytesLe(InnerKeyStorage_Version.V3_0),
            InnerKeyStorageV3.encode(decoded).finish(),
        ) as DecryptedEncodedInnerKeyStorageV3Bytes,
};
