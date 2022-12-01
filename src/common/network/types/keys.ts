import {type RawKey, type ReadonlyRawKey, wrapRawKey} from '~/common/crypto';
import {type SecureSharedBoxFactory, type SharedBoxFactory} from '~/common/crypto/box';
import {type WeakOpaque} from '~/common/types';

/**
 * The raw Client Key (often internally referred to as `ck` in the code and documentation) is a 32
 * bytes long, permanent secret key associated to the Threema ID.
 *
 * IMPORTANT: This is **THE** key which requires ultimate care! It **MUST** be consumed into a
 *            {@link ClientKey} ASAP.
 */
export type RawClientKey = WeakOpaque<RawKey, {readonly RawClientKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawClientKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawClientKey(key: Uint8Array): RawClientKey {
    return wrapRawKey(key) as RawClientKey;
}

/**
 * The Client Key (often internally referred to as `ck` in the code and documentation) is a 32
 * bytes long, permanent secret key associated to the Threema ID.
 *
 * IMPORTANT: This is **THE** key which requires ultimate care!
 */
export type ClientKey = WeakOpaque<SecureSharedBoxFactory, {readonly ClientKey: unique symbol}>;

/**
 * The raw device group key. It is a 32 bytes, permanent secret key associated to the Threema ID in
 * the context of a multi-device account.
 *
 * IMPORTANT: DO NOT hold a reference to this key beyond calling {@link deriveDeviceGroupKeys()}.
 */
export type RawDeviceGroupKey = WeakOpaque<RawKey, {readonly RawDeviceGroupKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawDeviceGroupKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawDeviceGroupKey(key: Uint8Array): RawDeviceGroupKey {
    return wrapRawKey(key as Uint8Array) as RawDeviceGroupKey;
}

/**
 * Temporary Client Key (32 bytes). Should be replaced periodically (e.g. for every connection).
 */
export type TemporaryClientKey = WeakOpaque<
    SharedBoxFactory,
    {readonly TemporaryClientKey: unique symbol}
>;

/**
 * Vouch Key (32 bytes). Used for authentication towards the chat server.
 */
export type VouchKey = WeakOpaque<RawKey, {readonly VouchKey: unique symbol}>;

/**
 * Directory Challenge Response Key (32 bytes). Used for authentication towards the directory server.
 */
export type DirectoryChallengeResponseKey = WeakOpaque<
    RawKey,
    {readonly DirectoryChallengeResponseKey: unique symbol}
>;

/**
 * A symmetric blob encryption key. Must be exactly 32 bytes long.
 */
export type RawBlobKey = WeakOpaque<ReadonlyRawKey, {readonly RawBlobKey: unique symbol}>;

/**
 * Wrap a key into a {@link RawBlobKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawBlobKey(key: Uint8Array): RawBlobKey {
    return wrapRawKey(key as Uint8Array).asReadonly() as RawBlobKey;
}
