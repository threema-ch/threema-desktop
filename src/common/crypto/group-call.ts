import type {ServicesForBackend} from '~/common/backend';
import {
    type CryptoBackend,
    type CryptoBox,
    type ReadonlyRawKey,
    NONCE_UNGUARDED_SCOPE,
    type NonceUnguardedScope,
    wrapRawKey,
    type UnwrappedRawKey,
    type PublicKey,
    type Cookie,
    NACL_CONSTANTS,
    type RawKey,
} from '~/common/crypto';
import {deriveKey, hash} from '~/common/crypto/blake2b';
import {PERSONALBYTES, SALTBYTES, createHash} from '~/common/crypto/blake2b/implementation';
import type {SharedBoxFactory} from '~/common/crypto/box';
import type {GroupView} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import {
    type GroupCallId,
    type ParticipantId,
    type GroupCallBaseData,
    createGroupCallId,
} from '~/common/network/protocol/call/group-call';
import type {ClientKey} from '~/common/network/types/keys';
import {
    ensureU8,
    tag,
    type ReadonlyUint8Array,
    type RepeatedTuple,
    type WeakOpaque,
    type u64,
    type u8,
} from '~/common/types';
import {assert} from '~/common/utils/assert';
import {UTF8} from '~/common/utils/codec';
import type {ProxyMarked} from '~/common/utils/endpoint';
import {u64ToBytesLe} from '~/common/utils/number';

type SecretBoxWithRandomNonce = CryptoBox<never, never, never, never, NonceUnguardedScope>;

/**
 * Key length of a Group Call Ley (GCK) in bytes.
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
 * Group call key derivation collection based on GCK.
 */
export interface GroupCallKeyDerivations {
    readonly callId: GroupCallId;
    readonly gckh: RawGroupCallKeyHash;
    readonly gchk: WeakOpaque<SecretBoxWithRandomNonce, {readonly GchkBox: unique symbol}>;
    readonly gcsk: WeakOpaque<SecretBoxWithRandomNonce, {readonly GcskBox: unique symbol}>;
}

const PERSONAL = UTF8.encodeFullyInto('3ma-call', new Uint8Array(PERSONALBYTES)).array;

/**
 * Derive all group call properties.
 */
export function deriveGroupCallProperties(
    services: Pick<ServicesForBackend, 'crypto' | 'device'>,
    group: GroupView,
    data: Omit<GroupCallBaseData, 'group' | 'derivations'>,
): GroupCallKeyDerivations {
    const derivations: {[K in keyof GroupCallKeyDerivations]: GroupCallKeyDerivations[K]} = {
        callId: createGroupCallId(
            hash(32, undefined, {personal: PERSONAL, salt: 'i'})
                .update(UTF8.encode(getIdentityString(services.device, group.creator)))
                .update(u64ToBytesLe(group.groupId))
                .update(Uint8Array.of(ensureU8(data.protocolVersion)))
                .update(data.gck.unwrap())
                .update(UTF8.encode(data.sfuBaseUrl.raw))
                .digest(),
        ),
        gckh: tag<GroupCallKeyDerivations['gckh']>(
            hash(32, data.gck, {personal: PERSONAL, salt: '#'}).digest(),
        ),
        gchk: tag<GroupCallKeyDerivations['gchk']>(
            services.crypto.getSecretBox(
                deriveKey(NACL_CONSTANTS.KEY_LENGTH, data.gck, {
                    personal: PERSONAL,
                    salt: 'h',
                }).asReadonly(),
                NONCE_UNGUARDED_SCOPE,
                undefined,
            ),
        ),
        gcsk: tag<GroupCallKeyDerivations['gcsk']>(
            services.crypto.getSecretBox(
                deriveKey(NACL_CONSTANTS.KEY_LENGTH, data.gck, {
                    personal: PERSONAL,
                    salt: 's',
                }).asReadonly(),
                NONCE_UNGUARDED_SCOPE,
                undefined,
            ),
        ),
    };
    return derivations;
}

/**
 * Derive the Group Call Normal Handshake Authentication (`GCNHAK`) key.
 */
export function deriveGroupCallNormalHandshakeAuthKey(
    services: Pick<ServicesForBackend, 'crypto'>,
    ck: ClientKey,
    gckh: RawGroupCallKeyHash,
    contactPublicKey: PublicKey,
): GroupCallNormalHandshakeAuthBox {
    // GCNHAK = Blake2b(key=<shared-secret>, salt='nha', personal='3ma-call', input=GCKH)
    return tag<GroupCallNormalHandshakeAuthBox>(
        services.crypto.getSecretBox(
            ck
                .deriveSharedKey(32, contactPublicKey, {
                    personal: PERSONAL,
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
 * Group Call Normal Handshake Authentication (`GCNHAK`) key box.
 */
export type GroupCallNormalHandshakeAuthBox = WeakOpaque<
    CryptoBox<never, never, never, never, NonceUnguardedScope>,
    {readonly GroupCallNormalHandshakeAuthBox: unique symbol}
>;

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

export const PCMK_LENGTH = 32;
const PCMK_SALT = UTF8.encodeFullyInto("m'", new Uint8Array(SALTBYTES)).array;

/**
 * A raw Participant Call Media Key (PCMK) (bytes). Must be exactly 32 bytes long.
 */
export type RawParticipantCallMediaKey = WeakOpaque<
    RawKey<typeof PCMK_LENGTH>,
    {readonly RawParticipantCallMediaKey: unique symbol}
>;

/**
 * State snapshot of a participant's media key (PCMK).
 */
export interface ParticipantCallMediaKeyState {
    readonly epoch: u8;
    readonly ratchetCounter: u8;
    readonly pcmk: RawParticipantCallMediaKey;
}

export function ensureMediaKeySuccessorState(
    current: ParticipantCallMediaKeyState,
    successor: ParticipantCallMediaKeyState,
): ParticipantCallMediaKeyState {
    // Ensure we're not reusing an epoch or ratchet counter within an epoch. This would otherwise
    // lead to nonce reuse.
    assert(
        (successor.epoch === 0 && current.epoch === 255) ||
            successor.epoch > current.epoch ||
            (successor.epoch === current.epoch &&
                successor.ratchetCounter > current.ratchetCounter),
        'Attempted to downgrade epoch or ratchet counter within an epoch',
    );
    return successor;
}

export function alignMediaKeyStateWith(
    current: ParticipantCallMediaKeyState,
    ratchetCounter: u8,
): ParticipantCallMediaKeyState {
    // Ensure the ratchet counter increased
    assert(
        current.ratchetCounter < ratchetCounter,
        'Attempted to align with an older ratchet counter',
    );

    // Make a copy of the current relevant state that we can mutate
    const state = {
        ratchetCounter: current.ratchetCounter,
        pcmk: current.pcmk.unwrap().slice(),
    };

    // Ratchet until the counter matches
    //
    // WARNING: Below code is using more low-level functions of Blake2b for performance (in-place
    // replacement of PCMK in a loop).
    for (; ratchetCounter !== state.ratchetCounter; ++state.ratchetCounter) {
        // PCMK' = BLAKE2b(key=PCMK, salt="m'", personal='3ma-call')
        //
        // CAUTION: This overwrites the PCMK in-place.
        createHash(PCMK_LENGTH, state.pcmk, PCMK_SALT, PERSONAL).digest(state.pcmk);
    }
    return {
        epoch: current.epoch,
        ratchetCounter: state.ratchetCounter,
        pcmk: tag<RawParticipantCallMediaKey>(wrapRawKey(state.pcmk, PCMK_LENGTH)),
    };
}

interface PendingParticipantCallMediaKeyState {
    readonly state: ParticipantCallMediaKeyState;
    readonly stale: boolean;
    readonly applied: () => void;
}

/**
 * Our own PCMK that we need to manage.
 *
 * When a participant joins, we need to increase the ratchet counter of the currently _applied_
 * PCMK.
 *
 * When a participant leaves, we need to increase the epoch, reset the ratchet counter and generate
 * a new _pending_ PCMK that will be immediately distributed but only applied after a 2s delay. Only
 * after that delay will it replace the currently _applied_ PCMK.
 */
export class LocalParticipantCallMediaKey {
    #_current: ParticipantCallMediaKeyState;
    #_pending:
        | {
              readonly state: ParticipantCallMediaKeyState;
              readonly applied: () => void;
              stale: boolean;
          }
        | undefined;

    public constructor(private readonly _crypto: CryptoBackend) {
        this.#_current = {
            epoch: 0,
            ratchetCounter: 0,
            pcmk: tag<RawParticipantCallMediaKey>(
                wrapRawKey(_crypto.randomBytes(new Uint8Array(PCMK_LENGTH)), PCMK_LENGTH),
            ),
        };
    }

    public get current(): ParticipantCallMediaKeyState {
        return this.#_current;
    }

    public get pending(): ParticipantCallMediaKeyState | undefined {
        return this.#_pending?.state;
    }

    public all():
        | RepeatedTuple<ParticipantCallMediaKeyState, 1>
        | RepeatedTuple<ParticipantCallMediaKeyState, 2> {
        return this.#_pending === undefined
            ? [this.#_current]
            : [this.#_current, this.#_pending.state];
    }

    public nextEpoch(): PendingParticipantCallMediaKeyState {
        // If another successor state is pending to be applied, mark it as _stale_ and abort.
        if (this.#_pending !== undefined) {
            this.#_pending.stale = true;
            return this.#_pending;
        }

        // Increase the epoch. Note that it is allowed to wrap.
        const current = this.#_current;
        let applied = false;
        const pending = (this.#_pending = {
            state: ensureMediaKeySuccessorState(current, {
                epoch: current.epoch === 255 ? 0 : current.epoch + 1,
                ratchetCounter: 0,
                pcmk: tag<RawParticipantCallMediaKey>(
                    wrapRawKey(this._crypto.randomBytes(new Uint8Array(PCMK_LENGTH)), PCMK_LENGTH),
                ),
            }),
            stale: false,
            applied: () => {
                // When the sucessor PCMK has been applied, replace it
                assert(pending === this.#_pending && !applied);
                this.#_pending = undefined;
                this.#_current.pcmk.purge();
                this.#_current = pending.state;
                applied = true;
            },
        });

        // Done
        return pending;
    }

    public nextRatchetCounter(): ParticipantCallMediaKeyState {
        // Note: The ratchet will be applied to the current PCMK, even when a successor state is
        // pending. This is perfectly fine though.

        // Ensure the ratchet counter does not overflow
        const current = this.#_current;
        if (current.ratchetCounter === 255) {
            throw new Error('Ratchet counter would overflow');
        }

        // Increase the ratchet counter by `1` and align with it
        this.#_current = alignMediaKeyStateWith(current, current.ratchetCounter + 1);
        return this.#_current;
    }
}

export type RawParticipantCallMediaKeyState = Omit<ParticipantCallMediaKeyState, 'pcmk'> & {
    readonly pcmk: UnwrappedRawKey;
};

export type MediaCryptoEncryptorBackendHandle = ProxyMarked & {
    readonly setPcmk: (pcmk: RawParticipantCallMediaKeyState) => void;
};

export type MediaCryptoDecryptorBackendHandle = ProxyMarked & {
    /** Remove a remote participant. */
    readonly remove: (participant: ParticipantId) => void;

    /**
     * Add PCMKs to the remote participant decryptor context.
     *
     * Note: Implicitly adds the remote participant if needed.
     */
    readonly addPcmks: (
        participant: ParticipantId,
        pcmks: readonly RawParticipantCallMediaKeyState[],
    ) => void;
};

export interface MediaCryptoHandleForBackend extends ProxyMarked {
    readonly encryptor: MediaCryptoEncryptorBackendHandle;
    readonly decryptor: MediaCryptoDecryptorBackendHandle;
}
