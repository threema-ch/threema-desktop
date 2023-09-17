import type {Packet as DisplayPacket, PacketDirection} from '#3sc/components/generic/PacketFlow';
import {type D2mPayloadType, D2mPayloadTypeUtils} from '~/common/enum';
import type {ProtocolError, ProtocolErrorType} from '~/common/error';
import {Struct} from '~/common/network/structbuf/base';
import type {ByteLengthEncoder, i53, u53, WeakOpaque} from '~/common/types';
import type {DomTransferable} from '~/common/utils/endpoint';

import type {D2mMessage, LayerEncoder} from '.';

// Re-export PacketFlow component types
export type {DisplayPacket, PacketDirection};

export type RawPacket = Uint8Array | ArrayBuffer | D2mMessage<D2mPayloadType, Data>;

/**
 * Metadata associated to a (partially) parsed packet.
 */
export interface PacketMeta {
    /**
     * The packet has triggered a protocol error. It may be a malformed
     * packet, of unknown type or received unexpectedly.
     */
    error?: ProtocolError<ProtocolErrorType>;

    /**
     * Short additional description of the packet.
     */
    info?: string;
}

/* eslint-disable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any, no-restricted-syntax */
/**
 * Possible content of data captured from a protocol payload.
 */
type Data =
    | null
    | boolean
    | number
    | string
    | Data[]
    | ArrayBuffer
    | Uint8Array
    | {[key in string | number]: any}
    | Struct
    | LayerEncoder<WeakOpaque<unknown, unknown>>;
/* eslint-enable @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any, no-restricted-syntax */

/**
 * Handles packets (malformed or correct) to be converted for debugging
 * purposes.
 */
export type RawCaptureHandler = (packet: RawPacket, meta?: PacketMeta) => void;

/**
 * A pair of capture handlers for a protocol layer.
 */
export interface RawCaptureHandlerPair {
    inbound: RawCaptureHandler;
    outbound: RawCaptureHandler;
}

/**
 * String representation of each existing protocol layer.
 */
export const LAYERS = ['Frame', 'Multiplex', 'TLE/Auth', 'Keep-Alive', 'E2E'] as const;
type Layers = (typeof LAYERS)[u53];

/**
 * Prepare layer data for capture output.
 *
 * This handles the following types in the following ways:
 *
 * - copies `null`,
 * - copies `Boolean`, `Number` and `String`,
 * - copies `Array` recursively,
 * - copies `ArrayBuffer`,
 * - copies `Uint8Array`,
 * - transforms `Struct` instances into a snapshot, then copies that snapshot
 *   object,
 * - copies `Object` recursively,
 * - transforms instances by copying each property into a new object,
 * - runs idempotent byte encoders and stores the result.
 *
 * Everything else will be treated as if it were an object and each property
 * will be copied recursively.
 */
function prepare(data: Data, transfers: DomTransferable[]): {data: Readonly<Data>; name?: string} {
    // Primitives
    if (
        data === null ||
        data.constructor === Boolean ||
        data.constructor === Number ||
        data.constructor === String
    ) {
        return {data};
    }

    // Plain array
    if (data instanceof Array) {
        return {data: data.map((item) => prepare(item, transfers).data)};
    }

    // ArrayBuffer
    if (data instanceof ArrayBuffer) {
        const copy = data.slice(0);
        transfers.push(copy);
        return {data: copy};
    }

    // Uint8Array
    // Note: For Uint8Array, we ignore the fact that it is a view of an
    //       underlying buffer, so the offset and length of the resulting
    //       copied buffer may likely be different.
    if (data instanceof Uint8Array) {
        const copy = data.slice(0);
        transfers.push(copy.buffer);
        return {data: copy};
    }

    // Struct, create a snapshot of it and copy that
    let name: string | undefined = undefined;
    if (data instanceof Struct) {
        name = data.constructor.name;
        // Note: We do not need to copy first since the underlying arrays will
        //       not be added into the transferables list. Thus, the arrays
        //       will be copied automatically.
        data = data.snapshot();
        data.__name__ = name;
    }

    // Encoder object
    if (
        data instanceof Object &&
        typeof data.byteLength === 'function' &&
        typeof data.encode === 'function'
    ) {
        const encoder = data as ByteLengthEncoder;
        const view = encoder.encode(new Uint8Array(encoder.byteLength()));
        transfers.push(view.buffer);
        return {data: view};
    }

    // Instance or plain object... or something else. Regardless, we'll treat
    // it as an object.
    const object: {[key in string | i53]: unknown} = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
            k,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            prepare(v, transfers).data,
        ]),
    );
    if (data.constructor !== Object) {
        name = object.__name__ = data.constructor.name;
    }
    return {data: object, name};
}

function convert(
    direction: PacketDirection,
    layer: Layers,
    packet: RawPacket,
    meta?: PacketMeta,
): [packet: DisplayPacket, transferable: readonly DomTransferable[]] {
    const transfers: DomTransferable[] = [];
    let result: DisplayPacket;
    let error;

    // Extract error
    if (meta?.error !== undefined) {
        error = meta.error.message;
    }

    // Create display object
    if (packet instanceof Uint8Array || packet instanceof ArrayBuffer) {
        const copy = packet.slice(0);
        const view = copy instanceof ArrayBuffer ? new Uint8Array(copy) : copy;
        transfers.push(view.buffer);
        result = {
            direction,
            timestamp: Date.now(),
            layer,
            name: `${packet.byteLength} byte`,
            payload: view,
            error,
        };
    } else {
        let name = D2mPayloadTypeUtils.NAME_OF[packet.type];
        const prepared = prepare(packet.payload, transfers);
        if (prepared.name !== undefined) {
            name += ` (${prepared.name})`;
        }
        result = {
            direction,
            timestamp: Date.now(),
            layer,
            name,
            payload: {
                type: packet.type,
                payload: prepared.data,
            },
            error,
        };
    }

    // Append additional description
    if (meta?.info !== undefined) {
        result.name += ` (${meta.info})`;
    }

    return [result, transfers];
}

export const RAW_CAPTURE_CONVERTER = Object.freeze({
    layer1: {
        inbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('inbound', 'Frame', packet, meta),
        outbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('outbound', 'Frame', packet, meta),
    },
    layer2: {
        inbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('inbound', 'Multiplex', packet, meta),
        outbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] => {
            throw new Error('Outbound layer 2 codec does not exist');
        },
    },
    layer3: {
        inbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('inbound', 'TLE/Auth', packet, meta),
        outbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('outbound', 'TLE/Auth', packet, meta),
    },
    layer4: {
        inbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('inbound', 'Keep-Alive', packet, meta),
        outbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('outbound', 'Keep-Alive', packet, meta),
    },
    layer5: {
        inbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('inbound', 'E2E', packet, meta),
        outbound: (
            packet: RawPacket,
            meta?: PacketMeta,
        ): [packet: DisplayPacket, transfers: readonly DomTransferable[]] =>
            convert('outbound', 'E2E', packet, meta),
    },
});

export type RawCaptureConverters = typeof RAW_CAPTURE_CONVERTER;
export type RawCaptureHandlers = {
    [K in keyof RawCaptureConverters]: {
        inbound: RawCaptureHandler;
        outbound: RawCaptureHandler;
    };
};
