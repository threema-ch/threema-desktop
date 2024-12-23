import {
    type CryptoBackend,
    NACL_CONSTANTS,
    type PublicKey,
    type RawKey,
    type ReadonlyRawKey,
    wrapRawKey,
} from '~/common/crypto';
import type {SecureSharedBoxFactory, SharedBoxFactory} from '~/common/crypto/box';
import type {CspE2eBox, CspPayloadBox} from '~/common/network/types';
import type {WeakOpaque} from '~/common/types';

/**
 * The raw Client Key (often internally referred to as `ck` in the code and documentation) is a 32
 * bytes long, permanent secret key associated to the Threema ID.
 *
 * IMPORTANT: This is **THE** key which requires ultimate care! It **MUST** be consumed into a
 *            {@link ClientKey} ASAP.
 */
export type RawClientKey = WeakOpaque<RawKey<32>, {readonly RawClientKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawClientKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawClientKey(key: Uint8Array): RawClientKey {
    return wrapRawKey(key, NACL_CONSTANTS.KEY_LENGTH) as RawClientKey;
}

/**
 * The Client Key (often internally referred to as `ck` in the code and documentation) is a 32
 * bytes long, permanent secret key associated to the Threema ID.
 *
 * IMPORTANT: This is **THE** key which requires ultimate care!
 */
export type ClientKey = WeakOpaque<
    SecureSharedBoxFactory<CspE2eBox>,
    {readonly ClientKey: unique symbol}
>;

/**
 * The raw device group key. It is a 32 bytes, permanent secret key associated to the Threema ID in
 * the context of a multi-device account.
 *
 * IMPORTANT: DO NOT hold a reference to this key beyond calling {@link deriveDeviceGroupKeys()}.
 */
export type RawDeviceGroupKey = WeakOpaque<RawKey<32>, {readonly RawDeviceGroupKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawDeviceGroupKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawDeviceGroupKey(key: Uint8Array): RawDeviceGroupKey {
    return wrapRawKey(key, NACL_CONSTANTS.KEY_LENGTH) as RawDeviceGroupKey;
}

/**
 * Temporary Client Key (32 bytes). Should be different for every connection.
 */
export type TemporaryClientKey = WeakOpaque<
    SharedBoxFactory<CspPayloadBox>,
    {readonly TemporaryClientKey: unique symbol}
>;

/**
 * Temporary Server Key (32 bytes). Should be different for every connection.
 */
export type TemporaryServerKey = WeakOpaque<
    PublicKey,
    {readonly TemporaryServerKey: unique symbol}
>;

/**
 * Vouch Key (32 bytes). Used for authentication towards the chat server.
 */
export type VouchKey = WeakOpaque<RawKey<32>, {readonly VouchKey: unique symbol}>;

/**
 * Directory Challenge Response Key (32 bytes). Used for authentication towards the directory server.
 */
export type DirectoryChallengeResponseKey = WeakOpaque<
    RawKey<32>,
    {readonly DirectoryChallengeResponseKey: unique symbol}
>;

/**
 * Box used for `MessageMetadata` encryption.
 */
export type MessageMetadataBox = WeakOpaque<
    CspE2eBox,
    {readonly MessageMetadataBox: unique symbol}
>;

/**
 * A symmetric blob encryption key. Must be exactly 32 bytes long.
 */
export type RawBlobKey = WeakOpaque<ReadonlyRawKey<32>, {readonly RawBlobKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawBlobKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawBlobKey(key: Uint8Array): RawBlobKey {
    return wrapRawKey(key, NACL_CONSTANTS.KEY_LENGTH).asReadonly() as RawBlobKey;
}

/**
 * Rendezvous Authentication Key (32 bytes). Used for authentication and initial encryption in the
 * Rendezvous protocol.
 */
export type RendezvousAuthenticationKey = WeakOpaque<
    ReadonlyRawKey<32>,
    {readonly RendezvousAuthenticationKey: unique symbol}
>;

/**
 * Wrap a key into a {@link RendezvousAuthenticationKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRendezvousAuthenticationKey(key: Uint8Array): RendezvousAuthenticationKey {
    return wrapRawKey(key, NACL_CONSTANTS.KEY_LENGTH).asReadonly() as RendezvousAuthenticationKey;
}

/**
 * Generate a random {@link RendezvousAuthenticationKey} using 32 cryptographically secure random
 * bytes.
 */
export function randomRendezvousAuthenticationKey(
    crypto: Pick<CryptoBackend, 'randomBytes'>,
): RendezvousAuthenticationKey {
    const keyBytes = crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH));
    return wrapRendezvousAuthenticationKey(keyBytes);
}
