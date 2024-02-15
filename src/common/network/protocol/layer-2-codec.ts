/**
 * Layer 2: Multiplex layer.
 *
 * This is the base encoding/decoding layer, where CSP (chat server) and D2M (mediator) messages are
 * demultiplexed:
 *
 *  - Decoding a D2M message container into a D2M or CSP message by switching on its type (and, for
 *    CSP message, switching on the authentication state).
 */
import {ProtocolError} from '~/common/error';
import * as protobuf from '~/common/network/protobuf';
import * as structbuf from '~/common/network/structbuf';
import {ensureError, unreachable} from '~/common/utils/assert';
import type {SyncTransformerCodec} from '~/common/utils/codec';
import type {IQueryableStore} from '~/common/utils/store';

import type {RawCaptureHandler} from './capture';
import {CspAuthState, CspAuthStateUtils} from './state';
import {decode} from './utils';

import {
    D2mPayloadType,
    type InboundL1CspMessage,
    type InboundL1D2mMessage,
    type InboundL1Message,
    type InboundL2CspMessage,
    type InboundL2D2mMessage,
    type InboundL2Message,
} from '.';

/**
 * Properties needed to appropriately decode incoming layer 1 messages.
 */
export interface Layer2Controller {
    readonly csp: IQueryableStore<CspAuthState>;
}

export class Layer2Decoder implements SyncTransformerCodec<InboundL1Message, InboundL2Message> {
    public constructor(
        private readonly _controller: Layer2Controller,
        private readonly _capture?: RawCaptureHandler,
    ) {}

    public transform(frame: InboundL1Message, forward: (message: InboundL2Message) => void): void {
        try {
            if (frame.type === D2mPayloadType.PROXY) {
                this._handleCspFrame(frame, forward);
            } else {
                this._handleD2mFrame(frame, forward);
            }
        } catch (error) {
            this._capture?.(frame, {
                error: error instanceof ProtocolError ? error : undefined,
            });
            throw ensureError(error);
        }
    }

    private _handleCspFrame(
        frame: InboundL1CspMessage,
        forward: (message: InboundL2Message) => void,
    ): void {
        const message = this._decodeCspMessage(frame);
        this._capture?.(message);
        forward(message);
    }

    private _decodeCspMessage(frame: InboundL1CspMessage): InboundL2CspMessage {
        const state = this._controller.csp.get();
        switch (state) {
            case CspAuthState.COMPLETE:
                return decode(frame, structbuf.csp.payload.Frame.decode);
            case CspAuthState.SERVER_HELLO:
                return decode(frame, structbuf.csp.handshake.ServerHello.decode);
            case CspAuthState.LOGIN_ACK:
                return decode(frame, structbuf.csp.handshake.LoginAck.decode);
            case CspAuthState.CLIENT_HELLO:
                throw new ProtocolError(
                    'csp',
                    `Unexpected inbound CSP message in CSP state ${CspAuthStateUtils.NAME_OF[state]}`,
                );
            default:
                return unreachable(state);
        }
    }

    private _handleD2mFrame(
        frame: InboundL1D2mMessage,
        forward: (message: InboundL2Message) => void,
    ): void {
        const message = this._decodeD2mMessage(frame);
        this._capture?.(message);
        forward(message);
    }

    private _decodeD2mMessage(frame: InboundL1D2mMessage): InboundL2D2mMessage {
        switch (frame.type) {
            case D2mPayloadType.SERVER_HELLO:
                return decode(frame, protobuf.d2m.ServerHello.decode);
            case D2mPayloadType.SERVER_INFO:
                return decode(frame, protobuf.d2m.ServerInfo.decode);
            case D2mPayloadType.REFLECTION_QUEUE_DRY:
                return decode(frame, protobuf.d2m.ReflectionQueueDry.decode);
            case D2mPayloadType.ROLE_PROMOTED_TO_LEADER:
                return decode(frame, protobuf.d2m.RolePromotedToLeader.decode);
            case D2mPayloadType.DEVICES_INFO:
                return decode(frame, protobuf.d2m.DevicesInfo.decode);
            case D2mPayloadType.DROP_DEVICE_ACK:
                return decode(frame, protobuf.d2m.DropDeviceAck.decode);
            case D2mPayloadType.BEGIN_TRANSACTION_ACK:
                return decode(frame, protobuf.d2m.BeginTransactionAck.decode);
            case D2mPayloadType.COMMIT_TRANSACTION_ACK:
                return decode(frame, protobuf.d2m.CommitTransactionAck.decode);
            case D2mPayloadType.TRANSACTION_REJECTED:
                return decode(frame, protobuf.d2m.TransactionRejected.decode);
            case D2mPayloadType.TRANSACTION_ENDED:
                return decode(frame, protobuf.d2m.TransactionEnded.decode);
            case D2mPayloadType.REFLECT_ACK:
                return decode(frame, structbuf.d2m.payload.ReflectAck.decode);
            case D2mPayloadType.REFLECTED:
                return decode(frame, structbuf.d2m.payload.Reflected.decode);
            default:
                return unreachable(frame);
        }
    }
}
