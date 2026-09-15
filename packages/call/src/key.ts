import {
    blake2bHash,
    deriveKey,
    NACL_CONSTANTS,
    NONCE_UNGUARDED_SCOPE,
    wrapRawKey,
    type CryptoBackend,
    type CryptoBox,
    type NonceUnguardedScope,
    type ReadonlyRawKey,
} from '@threema/crypto';
import {PERSONALBYTES} from '@threema/crypto/blake2b/implementation';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';

/**
 * Blake2b personalisation of every call key derivation, as defined by the call protocols.
 *
 * Note: This is exported because derivations that have not yet been extracted from an app must be
 * able to use the very same personalisation.
 */
export const CALL_PERSONAL = UTF8.encodeFullyInto('3ma-call', new Uint8Array(PERSONALBYTES)).array;

/**
 * A secret box whose nonce is chosen at random for each message.
 */
type SecretBoxWithRandomNonce = CryptoBox<never, never, never, never, NonceUnguardedScope>;

/**
 * Key length of a Group Call Key (GCK) in bytes.
 */
export const GROUP_CALL_KEY_LENGTH = 32;

/**
 * A Group Call Key (GCK) (bytes). Must be exactly 32 bytes long.
 */
export type RawGroupCallKey = WeakOpaque<
    ReadonlyRawKey<typeof GROUP_CALL_KEY_LENGTH>,
    {readonly RawGroupCallKey: unique symbol}
>;

/**
 * Wrap a key into a {@link RawGroupCallKey}.
 *
 * @throws {CryptoError} in case the key is not 32 bytes long.
 */
export function wrapRawGroupCallKey(key: Uint8Array): RawGroupCallKey {
    return tag<RawGroupCallKey>(wrapRawKey(key, GROUP_CALL_KEY_LENGTH).asReadonly());
}

/**
 * Group Call Key Hash (GCKH) (bytes). Must be exactly 32 long.
 */
export type RawGroupCallKeyHash = WeakOpaque<
    ReadonlyUint8Array,
    {readonly RawGroupCallKeyHash: unique symbol}
>;

export function ensureRawGroupCallKeyHash(value: unknown): RawGroupCallKeyHash {
    if (!(value instanceof Uint8Array)) {
        throw new Error(`Expected GCKH, got '${typeof value}'`);
    }
    if (value.byteLength !== 32) {
        throw new Error(`Array of length ${value.byteLength} is not a valid GCKH`);
    }
    return tag<RawGroupCallKeyHash>(value);
}

/**
 * Group Call Handshake Key (GCHK) box.
 */
export type GroupCallHandshakeKeyBox = WeakOpaque<
    SecretBoxWithRandomNonce,
    {readonly GchkBox: unique symbol}
>;

/**
 * Group Call State Key (GCSK) box.
 */
export type GroupCallStateKeyBox = WeakOpaque<
    SecretBoxWithRandomNonce,
    {readonly GcskBox: unique symbol}
>;

/**
 * Group call key derivation collection that depends on the GCK alone.
 *
 * Note: The Group Call ID is derived from the GCK as well but is bound to a group, so it is not part
 * of this collection. See {@link deriveGroupCallId}.
 */
export interface GroupCallKeys {
    readonly gckh: RawGroupCallKeyHash;
    readonly gchk: GroupCallHandshakeKeyBox;
    readonly gcsk: GroupCallStateKeyBox;
}

/**
 * Derive all call properties that depend on the GCK alone.
 */
export function deriveGroupCallKeys(
    crypto: Pick<CryptoBackend, 'getSecretBox'>,
    gck: RawGroupCallKey,
): GroupCallKeys {
    return {
        // GCKH = Blake2b(key=GCK, salt='#', personal='3ma-call')
        gckh: tag<RawGroupCallKeyHash>(
            blake2bHash(32, gck, {personal: CALL_PERSONAL, salt: '#'}).digest(),
        ),
        // GCHK = Blake2b(key=GCK, salt='h', personal='3ma-call')
        gchk: tag<GroupCallHandshakeKeyBox>(
            crypto.getSecretBox(
                deriveKey(NACL_CONSTANTS.KEY_LENGTH, gck, {
                    personal: CALL_PERSONAL,
                    salt: 'h',
                }).asReadonly(),
                NONCE_UNGUARDED_SCOPE,
                undefined,
            ),
        ),
        // GCSK = Blake2b(key=GCK, salt='s', personal='3ma-call')
        gcsk: tag<GroupCallStateKeyBox>(
            crypto.getSecretBox(
                deriveKey(NACL_CONSTANTS.KEY_LENGTH, gck, {
                    personal: CALL_PERSONAL,
                    salt: 's',
                }).asReadonly(),
                NONCE_UNGUARDED_SCOPE,
                undefined,
            ),
        ),
    };
}
