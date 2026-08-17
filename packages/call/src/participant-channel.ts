import {
    NONCE_UNGUARDED_SCOPE,
    type Cookie,
    type CryptoBackend,
    type CryptoBox,
    type NonceUnguardedScope,
    type PublicKey,
    type SecureSharedBoxFactory,
    type SharedBoxFactory,
} from '@threema/crypto';
import type {u64} from '@threema/ts-utils/integer/u64';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {CALL_PERSONAL, type RawGroupCallKeyHash} from './key.js';

/**
 * The ability to derive a subkey from the shared secret between a local secret key and a remote
 * public key.
 *
 * Note: This is deliberately picked from {@link SecureSharedBoxFactory} rather than declared by
 * hand, so that it cannot drift from the box surface it is satisfied by. The box type parameter is
 * irrelevant because {@link SecureSharedBoxFactory.deriveSharedKey} does not depend on it.
 *
 * Note: This is what keeps the derivation below free of a Threema identity: a group call satisfies
 * it with the user's Client Key (CK), while a participant without an identity can satisfy it with
 * any other non-ephemeral secret key.
 */
export type SharedKeyDeriver = Pick<SecureSharedBoxFactory<never>, 'deriveSharedKey'>;

/**
 * Group Call Normal Handshake Authentication (`GCNHAK`) key box.
 */
export type GroupCallNormalHandshakeAuthBox = WeakOpaque<
    CryptoBox<never, never, never, never, NonceUnguardedScope>,
    {readonly GroupCallNormalHandshakeAuthBox: unique symbol}
>;

/**
 * Derive the Group Call Normal Handshake Authentication (`GCNHAK`) key.
 *
 * Note: The name refers to the _normal_ handshake as defined by the group call protocol, in
 * contrast to a guest handshake, whose authentication key is a different derivation entirely.
 *
 * @param crypto The crypto backend to create the resulting box with.
 * @param localSecretKey The local non-ephemeral secret key to derive the shared secret from. In a
 *   group call this is the user's Client Key (CK).
 * @param gckh The Group Call Key Hash (GCKH) of the call.
 * @param remotePublicKey The public key of the remote participant.
 */
export function deriveGroupCallNormalHandshakeAuthKey(
    crypto: Pick<CryptoBackend, 'getSecretBox'>,
    localSecretKey: SharedKeyDeriver,
    gckh: RawGroupCallKeyHash,
    remotePublicKey: PublicKey,
): GroupCallNormalHandshakeAuthBox {
    // GCNHAK = Blake2b(key=<shared-secret>, salt='nha', personal='3ma-call', input=GCKH)
    return tag<GroupCallNormalHandshakeAuthBox>(
        crypto.getSecretBox(
            localSecretKey
                .deriveSharedKey(32, remotePublicKey, {
                    personal: CALL_PERSONAL,
                    salt: 'nha',
                    input: gckh,
                })
                .asReadonly(),
            NONCE_UNGUARDED_SCOPE,
            undefined,
        ),
    );
}

/**
 * The user's group call cookie towards a specific remote participant.
 */
export type LocalParticipantCookie = WeakOpaque<
    Cookie,
    {readonly LocalParticipantCookie: unique symbol}
>;

/**
 * The remote participant's group call cookie.
 */
export type RemoteParticipantCookie = WeakOpaque<
    Cookie,
    {readonly RemoteParticipantCookie: unique symbol}
>;

/**
 * The user's sequence number counter value towards a specific remote participant.
 */
export type LocalParticipantSequenceNumberValue = WeakOpaque<
    u64,
    {readonly ClientSequenceNumberValue: unique symbol}
>;

/**
 * The remote participant's sequence number counter value.
 */
export type RemoteParticipantSequenceNumberValue = WeakOpaque<
    u64,
    {readonly ServerSequenceNumberValue: unique symbol}
>;

/**
 * Participant to participant call key box.
 */
export type ParticipantCallBox = WeakOpaque<
    CryptoBox<
        RemoteParticipantCookie,
        LocalParticipantCookie,
        RemoteParticipantSequenceNumberValue,
        LocalParticipantSequenceNumberValue,
        NonceUnguardedScope
    >,
    {readonly ParticipantCallBox: unique symbol}
>;

/**
 * A local Participant Call Key (PCK) (bytes).
 */
export type LocalParticipantCallKey = WeakOpaque<
    SharedBoxFactory<ParticipantCallBox>,
    {readonly LocalParticipantCallKey: unique symbol}
>;

/**
 * Raw public part of the remote Participant Call Key (PCK) (bytes). Must be exactly 32 bytes long.
 */
export type RemoteParticipantCallKey = WeakOpaque<
    PublicKey,
    {readonly RemoteParticipantCallKey: unique symbol}
>;
