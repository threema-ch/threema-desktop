import {type CryptoBackend} from '~/common/crypto';
import {randomU64} from '~/common/crypto/random';
import {type GroupId, type MessageId} from '~/common/network/types';

import {type D2mMessage, type D2mPayloadType} from '.';

/**
 * Decode a D2M payload and uplift it into another D2M payload via its payload
 * decoder.
 * @param packet The D2M payload.
 * @param payloadDecoder The decoder that transforms the inner payload.
 * @returns an uplifted D2M payload.
 */
export function decode<P extends D2mMessage<D2mPayloadType, unknown>, OP>(
    packet: P,
    payloadDecoder: (payload: P['payload']) => OP,
): D2mMessage<P['type'], OP> {
    return {
        type: packet.type,
        payload: payloadDecoder(packet.payload),
    };
}

/**
 * Generate a random message ID.
 */
export function randomMessageId(crypto: Pick<CryptoBackend, 'randomBytes'>): MessageId {
    return randomU64(crypto) as MessageId;
}

/**
 * Generate a random group ID.
 */
export function randomGroupId(crypto: Pick<CryptoBackend, 'randomBytes'>): GroupId {
    return randomU64(crypto) as GroupId;
}
