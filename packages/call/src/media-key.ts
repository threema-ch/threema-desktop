import {wrapRawKey, type CryptoBackend, type RawKey, type UnwrappedRawKey} from '@threema/crypto';
import {createHash, SALTBYTES} from '@threema/crypto/blake2b/implementation';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import type {u8} from '@threema/ts-utils/integer/u8';
import {assert} from '@threema/ts-utils/meta/assert';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {CALL_PERSONAL} from './key.js';

/**
 * Key length of a Participant Call Media Key (PCMK) in bytes.
 */
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

/**
 * State snapshot of a participant's media key (PCMK) whose key material is unwrapped, i.e. the
 * shape in which a media key can be handed to another context (e.g. a media crypto worker).
 */
export type RawParticipantCallMediaKeyState = Omit<ParticipantCallMediaKeyState, 'pcmk'> & {
    readonly pcmk: UnwrappedRawKey;
};

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
        createHash(PCMK_LENGTH, state.pcmk, PCMK_SALT, CALL_PERSONAL).digest(state.pcmk);
    }
    return {
        epoch: current.epoch,
        ratchetCounter: state.ratchetCounter,
        pcmk: tag<RawParticipantCallMediaKey>(wrapRawKey(state.pcmk, PCMK_LENGTH)),
    };
}

/**
 * A media key state that has been distributed but is not applied yet.
 */
export interface PendingParticipantCallMediaKeyState {
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

    public constructor(private readonly _crypto: Pick<CryptoBackend, 'randomBytes'>) {
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
        | readonly [ParticipantCallMediaKeyState]
        | readonly [ParticipantCallMediaKeyState, ParticipantCallMediaKeyState] {
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
