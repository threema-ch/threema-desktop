import * as fs from 'node:fs';
import path from 'node:path';

import {bytesLeToU16} from '@threema/ts-utils/conversion/bytes-le-to-u16';

import {STATIC_CONFIG} from '~/common/config';
import type {
    InnerKeyStorage_Version,
    IntermediateKeyStorage_Version,
    OuterKeyStorage_Version,
} from '~/common/internal-protobuf/key-storage-file';
import {
    LATEST_KEY_STORAGE_ENCODING_HELPERS,
    LATEST_KEY_STORAGE_VERSION,
    type KeyStorageRemoteSecretDataStoreData,
    type KeyStorageRemoteSecretWriteData,
    type LatestKeyStorageLayers,
    type ServicesForKeyStorage,
} from '~/common/key-storage';
import {KeyStorageError} from '~/common/key-storage/common';
import {RemoteSecretApplicationStartMonitorTask} from '~/common/network/protocol/task/libthreema/remote-secret-monitor';
import type {RemoteSecretData} from '~/common/network/types';
import {
    decryptPasswordBased,
    decryptRemoteSecretBased,
    encryptPasswordBased,
    encryptRemoteSecretBased,
    type PasswordBasedKeyMaterial,
} from '~/common/node/key-storage/crypto';
import {unreachable} from '~/common/utils/assert';
import {pick} from '~/common/utils/object';

/**
 * Returns the path to the (current-generation) key storage file in the given
 * `profileDirectoryPath`. Important: The path is not validated, so it might not exist.
 *
 * Note: To retrieve the path to the key storage file of the old generation, use
 * {@link getDeprecatedKeyStoragePath}.
 *
 * @param profileDirectoryPath Path to the Threema profile directory to use as the base path.
 */
export function getKeyStoragePath(profileDirectoryPath: string): string {
    return path.join(profileDirectoryPath, ...STATIC_CONFIG.KEY_STORAGE_PATH);
}

/**
 * Returns the path to the deprecated key storage file in the given `profileDirectoryPath`.
 * Important: The path is not validated, so it might not exist.
 *
 * Note: To retrieve the path to the key storage file of the latest generation, use
 * {@link getKeyStoragePath}.
 *
 * @param profileDirectoryPath Path to the Threema profile directory to use as the base path.
 * @deprecated
 */
export function getDeprecatedKeyStoragePath(profileDirectoryPath: string): string {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return path.join(profileDirectoryPath, ...STATIC_CONFIG.DEPRECATED_KEY_STORAGE_PATH);
}

/**
 * Returns whether a (current-generation) key storage file exists in the expected location inside
 * the given `profileDirectoryPath`.
 *
 * @param profileDirectoryPath Path to the Threema profile directory to check inside of.
 */
export function getIsKeyStorageFilePresent(profileDirectoryPath: string): boolean {
    return fs.existsSync(getKeyStoragePath(profileDirectoryPath));
}

/**
 * Returns whether a deprecated key storage file exists in the expected location inside the given
 * `profileDirectoryPath`.
 *
 * @param profileDirectoryPath Path to the Threema profile directory to check inside of.
 */
export function getIsDeprecatedKeyStorageFilePresent(profileDirectoryPath: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    return fs.existsSync(getDeprecatedKeyStoragePath(profileDirectoryPath));
}

/**
 * Returns whether any key storage file exists in the expected location inside the given
 * `profileDirectoryPath`, regardless of whether it's of the current or deprecated generation.
 *
 * @param profileDirectoryPath Path to the Threema profile directory to check inside of.
 */
export function getIsAnyKeyStorageFilePresent(profileDirectoryPath: string): boolean {
    return (
        getIsKeyStorageFilePresent(profileDirectoryPath) ||
        getIsDeprecatedKeyStorageFilePresent(profileDirectoryPath)
    );
}

/**
 * Given the data needed to encode (and optionally Remote-Secret-encrypt) the inner key storage at
 * the latest version, perform the encoding and encryption steps and return
 * {@link LatestKeyStorageLayers['intermediate']['validated']['inner']}.
 *
 * @throws {KeyStorageError} If any operation fails during encryption or encoding.
 */
export function encodeAndEncryptLatestInnerKeyStorage(
    contents: LatestKeyStorageLayers['inner']['consumable'],
    remoteSecretWriteData: KeyStorageRemoteSecretWriteData | undefined,
    services: Pick<ServicesForKeyStorage, 'crypto' | 'logging'>,
): LatestKeyStorageLayers['intermediate']['validated']['inner'] {
    // Build the validated object and encode it.
    const validated: LatestKeyStorageLayers['inner']['validated'] = {
        databaseKey: contents.databaseKey,
        deviceCookie: contents.deviceCookie,
        deviceIds: contents.deviceIds,
        dgk: contents.dgk,
        identityData: contents.identityData,
    };
    const decoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.inner.validatedToDecoded(validated);
    const encoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.inner.decodedToEncoded(decoded);

    // Build the intermediate inner field (plaintext or Remote-Secret-protected).
    const intermediateInner: LatestKeyStorageLayers['intermediate']['validated']['inner'] =
        remoteSecretWriteData !== undefined
            ? {
                  $case: 'remoteSecretProtectedInner' as const,
                  remoteSecretProtectedInner: {
                      remoteSecretAuthenticationToken: remoteSecretWriteData.token,
                      remoteSecretHash: remoteSecretWriteData.hash,
                      onPremCachedRemoteSecretEndpointUrl: remoteSecretWriteData.endpoint,
                      encryptedInner: encryptRemoteSecretBased(
                          encoded,
                          {remoteSecret: remoteSecretWriteData.raw},
                          services,
                      ),
                  },
              }
            : {
                  $case: 'plaintextInner' as const,
                  plaintextInner: encoded as Uint8Array<ArrayBuffer>,
              };

    return intermediateInner;
}

/**
 * Given an already-encoded (and optionally Remote-Secret-encrypted) inner key storage at the latest
 * inner version, as well as the data needed to encode and encrypt the intermediate key storage,
 * perform the encoding and encryption steps and return
 * {@link LatestKeyStorageLayers['intermediate']['encrypted']}.
 *
 * @throws {KeyStorageError} If any operation fails during encryption or encoding.
 */
export async function encodeAndEncryptLatestIntermediateKeyStorage(
    inner: LatestKeyStorageLayers['intermediate']['validated']['inner'],
    contents: LatestKeyStorageLayers['intermediate']['consumable'],
    keyMaterial: PasswordBasedKeyMaterial,
    services: Pick<ServicesForKeyStorage, 'crypto' | 'logging'>,
): Promise<LatestKeyStorageLayers['intermediate']['encrypted']> {
    // Build the validated object and encode it.
    const validated: LatestKeyStorageLayers['intermediate']['validated'] = {
        inner,
        workCredentials: contents.workCredentials,
        onPremConfig: contents.onPremConfig,
    };
    const decoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.intermediate.validatedToDecoded(validated);
    const encoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.intermediate.decodedToEncoded(decoded);

    // Determine fresh KDF parameters and encrypt.
    const encrypted = (await encryptPasswordBased(
        encoded,
        keyMaterial,
        services,
    )) as LatestKeyStorageLayers['intermediate']['encrypted'];

    return encrypted;
}

/**
 * Given an already-encoded and encrypted intermediate key storage at the latest intermediate
 * version, as well as the data needed to encode and encrypt the outer key storage, perform the
 * encoding steps and return {@link LatestKeyStorageLayers['outer']['encoded']}.
 *
 * @throws {KeyStorageError} If any operation fails during encoding.
 */
export function encodeLatestOuterKeyStorage(
    encryptedIntermediate: LatestKeyStorageLayers['intermediate']['encrypted'],
    contents: LatestKeyStorageLayers['outer']['consumable'],
): LatestKeyStorageLayers['outer']['encoded'] {
    // Build the validated object and encode it.
    const validated: LatestKeyStorageLayers['outer']['validated'] = {
        encryptedIntermediate,
        kdfParameters: contents.kdfParameters,
    };
    const decoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.outer.validatedToDecoded(validated);
    const encoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.outer.decodedToEncoded(decoded);

    return encoded;
}

/**
 * Given {@link LatestKeyStorageLayers['outer']['encoded']} bytes, decode the outer and intermediate
 * key storage layers and return the contents.
 *
 * @throws {KeyStorageError} If any operation fails during decryption, decoding, or validation.
 */
export async function decryptAndDecodeLatestIntermediateKeyStorage(
    bytes: LatestKeyStorageLayers['outer']['encoded'],
    password: string,
    services: Pick<ServicesForKeyStorage, 'crypto' | 'logging'>,
): Promise<{
    readonly outer: LatestKeyStorageLayers['outer']['consumable'];
    readonly intermediate: LatestKeyStorageLayers['intermediate']['validated'];
}> {
    // Outer: Decode and validate.
    const outerVersion = bytesLeToU16(bytes.subarray(0, 2)) as OuterKeyStorage_Version;
    if (outerVersion !== LATEST_KEY_STORAGE_VERSION.outer) {
        throw new KeyStorageError(
            'malformed',
            `Encountered outer key storage version that is not latest: ${outerVersion}`,
        );
    }
    const decodedOuter = LATEST_KEY_STORAGE_ENCODING_HELPERS.outer.encodedToDecoded(bytes);
    const validatedOuter =
        LATEST_KEY_STORAGE_ENCODING_HELPERS.outer.decodedToValidated(decodedOuter);
    const consumableOuter =
        LATEST_KEY_STORAGE_ENCODING_HELPERS.outer.validatedToConsumable(validatedOuter);

    // Intermediate: Decrypt, decode, and validate.
    const decryptedIntermediate = await decryptPasswordBased(
        validatedOuter.encryptedIntermediate,
        {
            password,
            params: validatedOuter.kdfParameters.argon2id,
        },
        services,
    );
    const intermediateVersion = bytesLeToU16(
        decryptedIntermediate.subarray(0, 2),
    ) as IntermediateKeyStorage_Version;
    if (intermediateVersion !== LATEST_KEY_STORAGE_VERSION.intermediate) {
        throw new KeyStorageError(
            'malformed',
            `Encountered intermediate key storage version that is not latest: ${intermediateVersion}`,
        );
    }
    const decodedIntermediate = LATEST_KEY_STORAGE_ENCODING_HELPERS.intermediate.encodedToDecoded(
        decryptedIntermediate as LatestKeyStorageLayers['intermediate']['encoded'],
    );
    const validatedIntermediate =
        LATEST_KEY_STORAGE_ENCODING_HELPERS.intermediate.decodedToValidated(decodedIntermediate);

    return {
        outer: consumableOuter,
        intermediate: validatedIntermediate,
    };
}

/**
 * Given {@link LatestKeyStorageLayers['intermediate']['validated']['inner']}, decrypt (if
 * Remote-Secret-encrypted) and decode the inner key storage layer.
 *
 * @throws {KeyStorageError} If any operation fails during decryption, decoding, or validation.
 */
export async function decryptAndDecodeLatestInnerKeyStorage(
    intermediateInner: LatestKeyStorageLayers['intermediate']['validated']['inner'],
    services: Pick<ServicesForKeyStorage, 'crypto' | 'electron' | 'logging' | 'systemInfo'>,
): Promise<{
    readonly contents: LatestKeyStorageLayers['inner']['consumable'];
    readonly initialRemoteSecretStoreData: KeyStorageRemoteSecretDataStoreData;
}> {
    // If `intermediateInner` is Remote-Secret-protected, decrypt it first.
    let encodedInner: Uint8Array;
    let initialRemoteSecretData:
        | (KeyStorageRemoteSecretWriteData & KeyStorageRemoteSecretDataStoreData)
        | undefined;
    switch (intermediateInner.$case) {
        case 'plaintextInner':
            encodedInner = intermediateInner.plaintextInner;
            break;

        case 'remoteSecretProtectedInner': {
            const remoteSecretData: RemoteSecretData = {
                endpoint:
                    intermediateInner.remoteSecretProtectedInner
                        .onPremCachedRemoteSecretEndpointUrl,
                hash: intermediateInner.remoteSecretProtectedInner.remoteSecretHash,
                token: intermediateInner.remoteSecretProtectedInner.remoteSecretAuthenticationToken,
            };

            // Run `RemoteSecretApplicationStartMonitorTask` until it yields the Remote Secret.
            // Note: The task itself is supposed to handle any errors, so this is expected not to
            // fail.
            const task = new RemoteSecretApplicationStartMonitorTask(services, remoteSecretData);
            const {initialTimeoutMs, remoteSecret} = await task.run();

            encodedInner = decryptRemoteSecretBased(
                intermediateInner.remoteSecretProtectedInner.encryptedInner,
                {remoteSecret},
                services,
            );
            initialRemoteSecretData = {
                ...remoteSecretData,
                initialTimeoutMs,
                raw: remoteSecret,
            };
            break;
        }

        default:
            unreachable(
                intermediateInner,
                new KeyStorageError(
                    'malformed',
                    `Encountered unrecognized intermediate inner case: ${intermediateInner}`,
                ),
            );
    }

    // Decode and validate.
    const innerVersion = bytesLeToU16(encodedInner.subarray(0, 2)) as InnerKeyStorage_Version;
    if (innerVersion !== LATEST_KEY_STORAGE_VERSION.inner) {
        throw new KeyStorageError(
            'malformed',
            `Encountered inner key storage version that is not latest: ${innerVersion}`,
        );
    }
    const decoded = LATEST_KEY_STORAGE_ENCODING_HELPERS.inner.encodedToDecoded(
        encodedInner as unknown as LatestKeyStorageLayers['inner']['encoded'],
    );
    const validated = LATEST_KEY_STORAGE_ENCODING_HELPERS.inner.decodedToValidated(decoded);
    const consumable = LATEST_KEY_STORAGE_ENCODING_HELPERS.inner.validatedToConsumable(validated);

    return {
        contents: consumable,
        initialRemoteSecretStoreData:
            initialRemoteSecretData === undefined
                ? undefined
                : pick(initialRemoteSecretData, [
                      'endpoint',
                      'hash',
                      'initialTimeoutMs',
                      'token',
                  ] as const),
    };
}
