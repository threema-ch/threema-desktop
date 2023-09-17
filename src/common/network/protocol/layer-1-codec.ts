/**
 * Layer 1: Frame layer.
 *
 * This is where messages become bytes, and vice versa:
 *
 * - Decoding inbound bytes to a D2M message container.
 * - Encoding an outbound D2M message container to bytes.
 */
import type {ServicesForBackend} from '~/common/backend';
import {D2mPayloadTypeUtils} from '~/common/enum';
import {extractErrorMessage, ProtocolError} from '~/common/error';
import type {Logger} from '~/common/logging';
import * as structbuf from '~/common/network/structbuf';
import type {ByteLengthEncoder, u53} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import {byteToHex} from '~/common/utils/byte';
import type {TransformerCodec, TransformerCodecController} from '~/common/utils/codec';

import type {RawCaptureHandler} from './capture';

import {D2mPayloadType, type InboundL1Message, type OutboundL2Message, type RawL1Data} from '.';

export class Layer1Decoder implements TransformerCodec<ArrayBuffer, InboundL1Message> {
    private readonly _services: ServicesForBackend;
    private readonly _log: Logger;
    private readonly _capture?: RawCaptureHandler;

    public constructor(services: ServicesForBackend, capture?: RawCaptureHandler) {
        this._services = services;
        this._log = services.logging.logger('network.protocol.l1.decoder');
        this._capture = capture;
    }

    public transform(
        buffer: ArrayBuffer,
        controller: TransformerCodecController<InboundL1Message>,
    ): void {
        const array = new Uint8Array(buffer);
        let frame;
        try {
            frame = this._decodeFrame(array);
        } catch (error) {
            this._capture?.(array, {
                error: error instanceof ProtocolError ? error : undefined,
            });
            if (error instanceof ProtocolError) {
                this._log.warn(
                    `Discarding inbound frame, reason: ${extractErrorMessage(error, 'short')}`,
                );
                return;
            }
            throw ensureError(error);
        }

        // Enqueue frame
        this._capture?.(frame);
        controller.enqueue(frame);
    }

    /**
     * Decode the frame.
     *
     * @throws {ProtocolError} if an unknown D2M payload type is encountered.
     */
    private _decodeFrame(array: Uint8Array): InboundL1Message {
        // Ensure it doesn't violate the maximum frame length
        if (array.byteLength > this._services.config.MEDIATOR_FRAME_MAX_BYTE_LENGTH) {
            throw new ProtocolError('d2m', `Inbound frame too large: ${array.byteLength} bytes`);
        }

        // Ensure minimum frame length
        if (array.byteLength < this._services.config.MEDIATOR_FRAME_MIN_BYTE_LENGTH) {
            throw new ProtocolError('d2m', `Inbound frame too small: ${array.byteLength} bytes`);
        }

        // Decode D2M payload
        const container = structbuf.d2m.payload.Container.decode(array);
        const type = this._getD2mPayloadType(container.type);
        return {
            type,
            payload: container.payload as RawL1Data,
        };
    }

    /**
     * Decode the D2M payload type.
     *
     * @throws {ProtocolError} if an unknown payload type is encountered.
     */
    private _getD2mPayloadType(type: u53): InboundL1Message['type'] {
        const maybePayloadType = type as InboundL1Message['type'];
        switch (maybePayloadType) {
            case D2mPayloadType.PROXY:
            case D2mPayloadType.SERVER_HELLO:
            case D2mPayloadType.SERVER_INFO:
            case D2mPayloadType.REFLECTION_QUEUE_DRY:
            case D2mPayloadType.ROLE_PROMOTED_TO_LEADER:
            case D2mPayloadType.DEVICES_INFO:
            case D2mPayloadType.DROP_DEVICE_ACK:
            case D2mPayloadType.BEGIN_TRANSACTION_ACK:
            case D2mPayloadType.COMMIT_TRANSACTION_ACK:
            case D2mPayloadType.TRANSACTION_REJECTED:
            case D2mPayloadType.TRANSACTION_ENDED:
            case D2mPayloadType.REFLECT_ACK:
            case D2mPayloadType.REFLECTED:
                return maybePayloadType;
            default:
                return unreachable(
                    maybePayloadType,
                    new ProtocolError(
                        'd2m',
                        `Unknown inbound payload type: 0x${byteToHex(maybePayloadType)}`,
                    ),
                );
        }
    }
}

export class Layer1Encoder implements TransformerCodec<OutboundL2Message, Uint8Array> {
    private static readonly _RESERVED = new Uint8Array(3);
    private readonly _buffer: Uint8Array;
    private readonly _capture?: RawCaptureHandler;

    public constructor(services: ServicesForBackend, capture?: RawCaptureHandler) {
        this._buffer = new Uint8Array(services.config.MEDIATOR_FRAME_MAX_BYTE_LENGTH);
        this._capture = capture;
    }

    public transform(
        message: OutboundL2Message,
        controller: TransformerCodecController<Uint8Array>,
    ): void {
        // Encode from D2M payload
        const frame = structbuf.d2m.payload.Container.encode(
            {
                type: message.type,
                reserved: Layer1Encoder._RESERVED,
                payload: message.payload as ByteLengthEncoder,
            } as structbuf.d2m.payload.ContainerEncodable,
            this._buffer,
        );

        // Enqueue frame
        this._capture?.(frame, {
            info: D2mPayloadTypeUtils.NAME_OF[message.type],
        });
        controller.enqueue(frame);
    }
}
