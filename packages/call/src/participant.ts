import type {u16} from '@threema/ts-utils/integer/u16';
import type {u53} from '@threema/ts-utils/integer/u53';
import {assert} from '@threema/ts-utils/meta/assert';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {SDP_TOKEN_RANGE} from '@threema/webrtc/sdp';

const MIDS = [
    ...SDP_TOKEN_RANGE,
    ...SDP_TOKEN_RANGE.map((left) => SDP_TOKEN_RANGE.map((right) => `${left}${right}`)).flat(),
] as const;
const MIDS_STEP = 8;
export const MIDS_MAX = MIDS.length / MIDS_STEP;
assert(Number.isInteger(MIDS_MAX));

/** A valid Participant ID is [0, 790[ due to the way we map MIDs. */
export type ParticipantId = WeakOpaque<u16, {readonly ParticipantId: unique symbol}>;

export function isParticipantId(value: u53): value is ParticipantId {
    return value >= 0 && value < MIDS_MAX;
}

export function ensureParticipantId(value: u53): ParticipantId {
    if (!isParticipantId(value)) {
        throw Error(`Not a valid participant id: '${value}'`);
    }
    return value;
}

/** Length (in bytes) of a participant UID. */
export const PARTICIPANT_UID_LENGTH = 16;

/**
 * A participant UID: a 16-byte unique random id assigned by the SFU (since SFU v1.4.0). Distinct
 * from the (small, MID-derived) {@link ParticipantId}. Used as the signed payload of conference join
 * approvals (`GrantApproval`/`Approval`).
 */
export type ParticipantUid = WeakOpaque<Uint8Array, {readonly ParticipantUid: unique symbol}>;

export function ensureParticipantUid(value: Uint8Array): ParticipantUid {
    if (value.byteLength !== PARTICIPANT_UID_LENGTH) {
        throw new Error(`Not a valid participant UID (length ${value.byteLength})`);
    }
    return tag<ParticipantUid>(value);
}

/**
 * MIDs are technically transmitted as bytes but **THANKS TO SDP** we are actually limited to what
 * is accepted as an SDP token. This means that if we want to only transfer 1 byte, out of 256
 * possible MIDs we can only use 79. Considering that we need multiple media lines for each
 * participant, that won't be enough, so we need to expand to one and two bytes. This means we have
 * a total amount of 79 + 79^2 = 6320 MIDs. In order to leave some room for future media lines (e.g.
 * screenshare), we slice these MIDs into partitions of 8 MIDs per participant, so we can
 * theoretically serve 790 participants in a single call.
 *
 * The MID permutations **must** be generated in exactly the same order on all clients to get the
 * correct MIDs for a participant.
 */
export function getMids(participantId: ParticipantId): {
    readonly microphone: string;
    readonly camera: string;
    readonly screen: string;
    readonly data: string;
} {
    const offset = participantId * MIDS_STEP;
    const mids = MIDS.slice(offset, offset + MIDS_STEP);
    if (mids.length !== MIDS_STEP) {
        throw new Error(`Unable to infer MIDs from participant id '${participantId}'`);
    }
    const [microphone, camera, screen, , , , , data] = mids;
    return {
        microphone: unwrap(microphone),
        camera: unwrap(camera),
        screen: unwrap(screen),
        data: unwrap(data),
    };
}
