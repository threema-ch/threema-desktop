import {blake2bHash} from '@threema/crypto';
import type {IdentityString} from '@threema/domain';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {bytesToHex} from '@threema/ts-utils/byte/bytes-to-hex';
import {UTF8} from '@threema/ts-utils/codec/utf8';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {u64} from '@threema/ts-utils/integer/u64';
import {ensureU8} from '@threema/ts-utils/integer/u8';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';
import {u64ToBytesLe} from '@threema/ts-utils/number/u64-to-bytes-le';

import {CALL_PERSONAL, type RawGroupCallKey} from './key.js';

/** Group Call ID value in hex. */
export type GroupCallIdValue = WeakOpaque<string, {readonly GroupCallIdValue: unique symbol}>;

/** A valid Group Call ID is the output of Blake2b hash with 32 bytes length. */
export interface GroupCallId {
    readonly bytes: ReadonlyUint8Array;
    readonly id: GroupCallIdValue;
    readonly shortened: string;
}

export function createGroupCallId(bytes: ReadonlyUint8Array): GroupCallId {
    if (bytes.byteLength !== 32 || bytes.every((byte) => byte === 0)) {
        throw Error('Not a valid group call id');
    }
    const id = tag<GroupCallIdValue>(bytesToHex(bytes, ''));
    return {
        bytes,
        id,
        shortened: `${id.slice(0, 4)}..${id.slice(-4)}`,
    };
}

/**
 * The properties a Group Call ID is derived from.
 *
 * Note: The order of the properties matches the order in which they are hashed.
 */
export interface GroupCallIdProperties {
    /** Identity of the creator of the group the call belongs to. */
    readonly creatorIdentity: IdentityString;
    /** ID of the group the call belongs to. */
    readonly groupId: u64;
    /** Protocol version used in the announcement. */
    readonly protocolVersion: u53;
    /** Group Call Key (GCK) used for the call. */
    readonly gck: RawGroupCallKey;
    /** Raw SFU base URL, exactly as it was announced. */
    readonly sfuBaseUrl: string;
}

/**
 * Derive the Group Call ID from the group the call belongs to and the call's properties.
 *
 * Note: This is the only call key derivation that is bound to a group. All other derivations depend
 * on the GCK alone, see {@link deriveGroupCallKeys}.
 *
 * @throws {Error} in case the protocol version does not fit into a byte.
 */
export function deriveGroupCallId(properties: GroupCallIdProperties): GroupCallId {
    return createGroupCallId(
        blake2bHash(32, undefined, {personal: CALL_PERSONAL, salt: 'i'})
            .update(UTF8.encode(properties.creatorIdentity))
            .update(u64ToBytesLe(properties.groupId))
            .update(Uint8Array.of(ensureU8(properties.protocolVersion)))
            .update(properties.gck.unwrap())
            .update(UTF8.encode(properties.sfuBaseUrl))
            .digest(),
    );
}
