import {
    type CspE2eContactControlType,
    type CspE2eConversationType,
    type CspE2eForwardSecurityType,
    type CspE2eGroupControlType,
    type CspE2eGroupConversationType,
    type CspE2eGroupStatusUpdateType,
    type CspE2eStatusUpdateType,
    type MessageType,
    CspE2eContactControlTypeUtils,
    CspE2eConversationTypeUtils,
    CspE2eForwardSecurityTypeUtils,
    CspE2eGroupControlTypeUtils,
    CspE2eGroupConversationTypeUtils,
    CspE2eGroupStatusUpdateTypeUtils,
    CspE2eStatusUpdateTypeUtils,
    CspExtensionType,
    CspMessageFlag,
    CspPayloadType,
    D2mPayloadType,
} from '~/common/enum';
import type * as protobuf from '~/common/network/protobuf';
import type * as structbuf from '~/common/network/structbuf';
import {type ByteLengthEncoder, type u53, type WeakOpaque} from '~/common/types';

// Re-export enums
export {D2mPayloadType, CspExtensionType, CspPayloadType, CspMessageFlag};

/**
 * An idempotent encoder to encode into bytes.
 */
export type LayerEncoder<T> = WeakOpaque<ByteLengthEncoder, {readonly Encoder: T}>;

export interface D2mMessage<T extends D2mPayloadType, P> {
    type: T;
    payload: P;
}

export type CspMessage<P> = D2mMessage<D2mPayloadType.PROXY, P>;

export interface CspPayload<T extends CspPayloadType, P> {
    type: T;
    payload: P;
}

export type RawL1Data = WeakOpaque<Uint8Array, {readonly RawL1Data: unique symbol}>;

export type InboundL1Message = InboundL1CspMessage | InboundL1D2mMessage;
export type InboundL1CspMessage = CspMessage<RawL1Data>;
export type InboundL1D2mMessage =
    | D2mMessage<D2mPayloadType.SERVER_HELLO, RawL1Data>
    | D2mMessage<D2mPayloadType.SERVER_INFO, RawL1Data>
    | D2mMessage<D2mPayloadType.REFLECTION_QUEUE_DRY, RawL1Data>
    | D2mMessage<D2mPayloadType.ROLE_PROMOTED_TO_LEADER, RawL1Data>
    | D2mMessage<D2mPayloadType.DEVICES_INFO, RawL1Data>
    | D2mMessage<D2mPayloadType.DROP_DEVICE_ACK, RawL1Data>
    | D2mMessage<D2mPayloadType.BEGIN_TRANSACTION_ACK, RawL1Data>
    | D2mMessage<D2mPayloadType.COMMIT_TRANSACTION_ACK, RawL1Data>
    | D2mMessage<D2mPayloadType.TRANSACTION_REJECTED, RawL1Data>
    | D2mMessage<D2mPayloadType.TRANSACTION_ENDED, RawL1Data>
    | D2mMessage<D2mPayloadType.REFLECT_ACK, RawL1Data>
    | D2mMessage<D2mPayloadType.REFLECTED, RawL1Data>;

export type InboundL2Message = InboundL2CspMessage | InboundL2D2mMessage;
export type InboundL2CspMessage =
    | CspMessage<structbuf.csp.handshake.ServerHello>
    | CspMessage<structbuf.csp.handshake.LoginAck>
    | CspMessage<structbuf.csp.payload.Frame>;

export type InboundL2D2mMessage =
    | D2mMessage<D2mPayloadType.SERVER_HELLO, protobuf.d2m.ServerHello>
    | D2mMessage<D2mPayloadType.SERVER_INFO, protobuf.d2m.ServerInfo>
    | D2mMessage<D2mPayloadType.REFLECTION_QUEUE_DRY, protobuf.d2m.ReflectionQueueDry>
    | D2mMessage<D2mPayloadType.ROLE_PROMOTED_TO_LEADER, protobuf.d2m.RolePromotedToLeader>
    | D2mMessage<D2mPayloadType.DEVICES_INFO, protobuf.d2m.DevicesInfo>
    | D2mMessage<D2mPayloadType.DROP_DEVICE_ACK, protobuf.d2m.DropDeviceAck>
    | D2mMessage<D2mPayloadType.BEGIN_TRANSACTION_ACK, protobuf.d2m.BeginTransactionAck>
    | D2mMessage<D2mPayloadType.COMMIT_TRANSACTION_ACK, protobuf.d2m.CommitTransactionAck>
    | D2mMessage<D2mPayloadType.TRANSACTION_REJECTED, protobuf.d2m.TransactionRejected>
    | D2mMessage<D2mPayloadType.TRANSACTION_ENDED, protobuf.d2m.TransactionEnded>
    | D2mMessage<D2mPayloadType.REFLECT_ACK, structbuf.d2m.payload.ReflectAck>
    | D2mMessage<D2mPayloadType.REFLECTED, structbuf.d2m.payload.Reflected>;

export type OutboundL2Message = OutboundL2CspMessage | OutboundL2D2mMessage;
export type OutboundL2CspMessage =
    | CspMessage<LayerEncoder<structbuf.csp.handshake.ClientHelloEncodable>>
    | CspMessage<LayerEncoder<structbuf.csp.handshake.LoginEncodable>>
    | CspMessage<LayerEncoder<structbuf.csp.payload.FrameEncodable>>;
export type OutboundL2D2mMessage =
    | D2mMessage<D2mPayloadType.CLIENT_HELLO, LayerEncoder<protobuf.d2m.ClientHelloEncodable>>
    | D2mMessage<
          D2mPayloadType.GET_DEVICES_INFO,
          LayerEncoder<protobuf.d2m.GetDevicesInfoEncodable>
      >
    | D2mMessage<D2mPayloadType.DROP_DEVICE, LayerEncoder<protobuf.d2m.DropDeviceEncodable>>
    | D2mMessage<
          D2mPayloadType.SET_SHARED_DEVICE_DATA,
          LayerEncoder<protobuf.d2m.SetSharedDeviceDataEncodable>
      >
    | D2mMessage<
          D2mPayloadType.BEGIN_TRANSACTION,
          LayerEncoder<protobuf.d2m.BeginTransactionEncodable>
      >
    | D2mMessage<
          D2mPayloadType.COMMIT_TRANSACTION,
          LayerEncoder<protobuf.d2m.CommitTransactionEncodable>
      >
    | D2mMessage<D2mPayloadType.REFLECT, LayerEncoder<structbuf.d2m.payload.ReflectEncodable>>
    | D2mMessage<
          D2mPayloadType.REFLECTED_ACK,
          LayerEncoder<structbuf.d2m.payload.ReflectedAckEncodable>
      >;

export type InboundL3Message = InboundL3CspMessage | InboundL3D2mMessage;
export type InboundL3CspMessage = CspMessage<
    | CspPayload<CspPayloadType.ECHO_REQUEST, structbuf.csp.payload.EchoRequest>
    | CspPayload<CspPayloadType.ECHO_RESPONSE, structbuf.csp.payload.EchoResponse>
    | CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.LegacyMessage>
    | CspPayload<CspPayloadType.OUTGOING_MESSAGE_ACK, structbuf.csp.payload.MessageAck>
    | CspPayload<CspPayloadType.CLOSE_ERROR, structbuf.csp.payload.CloseError>
    | CspPayload<CspPayloadType.ALERT, structbuf.csp.payload.Alert>
>;
export type InboundL3D2mMessage =
    | D2mMessage<D2mPayloadType.DEVICES_INFO, protobuf.d2m.DevicesInfo>
    | D2mMessage<D2mPayloadType.DROP_DEVICE_ACK, protobuf.d2m.DropDeviceAck>
    | D2mMessage<D2mPayloadType.BEGIN_TRANSACTION_ACK, protobuf.d2m.BeginTransactionAck>
    | D2mMessage<D2mPayloadType.COMMIT_TRANSACTION_ACK, protobuf.d2m.CommitTransactionAck>
    | D2mMessage<D2mPayloadType.TRANSACTION_REJECTED, protobuf.d2m.TransactionRejected>
    | D2mMessage<D2mPayloadType.TRANSACTION_ENDED, protobuf.d2m.TransactionEnded>
    | D2mMessage<D2mPayloadType.REFLECT_ACK, structbuf.d2m.payload.ReflectAck>
    | D2mMessage<D2mPayloadType.REFLECTED, structbuf.d2m.payload.Reflected>;

export type OutboundL3Message = OutboundL3CspMessage | OutboundL3D2mMessage;
export type OutboundL3CspMessage = CspMessage<
    | CspPayload<
          CspPayloadType.ECHO_REQUEST,
          LayerEncoder<structbuf.csp.payload.EchoRequestEncodable>
      >
    | CspPayload<
          CspPayloadType.ECHO_RESPONSE,
          LayerEncoder<structbuf.csp.payload.EchoResponseEncodable>
      >
    | CspPayload<
          CspPayloadType.OUTGOING_MESSAGE,
          LayerEncoder<structbuf.csp.payload.LegacyMessageEncodable>
      >
    | CspPayload<
          CspPayloadType.INCOMING_MESSAGE_ACK,
          LayerEncoder<structbuf.csp.payload.MessageAckEncodable>
      >
    | CspPayload<
          CspPayloadType.SET_CONNECTION_IDLE_TIMEOUT,
          LayerEncoder<structbuf.csp.payload.SetConnectionIdleTimeoutEncodable>
      >
>;
export type OutboundL3D2mMessage =
    | D2mMessage<
          D2mPayloadType.GET_DEVICES_INFO,
          LayerEncoder<protobuf.d2m.GetDevicesInfoEncodable>
      >
    | D2mMessage<D2mPayloadType.DROP_DEVICE, LayerEncoder<protobuf.d2m.DropDeviceEncodable>>
    | D2mMessage<
          D2mPayloadType.SET_SHARED_DEVICE_DATA,
          LayerEncoder<protobuf.d2m.SetSharedDeviceDataEncodable>
      >
    | D2mMessage<
          D2mPayloadType.BEGIN_TRANSACTION,
          LayerEncoder<protobuf.d2m.BeginTransactionEncodable>
      >
    | D2mMessage<
          D2mPayloadType.COMMIT_TRANSACTION,
          LayerEncoder<protobuf.d2m.CommitTransactionEncodable>
      >
    | D2mMessage<D2mPayloadType.REFLECT, LayerEncoder<structbuf.d2m.payload.ReflectEncodable>>
    | D2mMessage<
          D2mPayloadType.REFLECTED_ACK,
          LayerEncoder<structbuf.d2m.payload.ReflectedAckEncodable>
      >;

export type InboundL4Message = InboundL4CspMessage | InboundL4D2mMessage;
export type InboundL4CspMessage = CspMessage<
    | CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.LegacyMessage>
    | CspPayload<CspPayloadType.OUTGOING_MESSAGE_ACK, structbuf.csp.payload.MessageAck>
    | CspPayload<CspPayloadType.CLOSE_ERROR, structbuf.csp.payload.CloseError>
    | CspPayload<CspPayloadType.ALERT, structbuf.csp.payload.Alert>
>;
export type InboundL4D2mMessage =
    | D2mMessage<D2mPayloadType.DEVICES_INFO, protobuf.d2m.DevicesInfo>
    | D2mMessage<D2mPayloadType.DROP_DEVICE_ACK, protobuf.d2m.DropDeviceAck>
    | D2mMessage<D2mPayloadType.BEGIN_TRANSACTION_ACK, protobuf.d2m.BeginTransactionAck>
    | D2mMessage<D2mPayloadType.COMMIT_TRANSACTION_ACK, protobuf.d2m.CommitTransactionAck>
    | D2mMessage<D2mPayloadType.TRANSACTION_REJECTED, protobuf.d2m.TransactionRejected>
    | D2mMessage<D2mPayloadType.TRANSACTION_ENDED, protobuf.d2m.TransactionEnded>
    | D2mMessage<D2mPayloadType.REFLECT_ACK, structbuf.d2m.payload.ReflectAck>
    | D2mMessage<D2mPayloadType.REFLECTED, structbuf.d2m.payload.Reflected>;

export type OutboundL4Message = OutboundL4CspMessage | OutboundL4D2mMessage;
export type OutboundL4CspMessage = CspMessage<
    | CspPayload<
          CspPayloadType.OUTGOING_MESSAGE,
          LayerEncoder<structbuf.csp.payload.LegacyMessageEncodable>
      >
    | CspPayload<
          CspPayloadType.INCOMING_MESSAGE_ACK,
          LayerEncoder<structbuf.csp.payload.MessageAckEncodable>
      >
>;
export type OutboundL4D2mMessage =
    | D2mMessage<
          D2mPayloadType.GET_DEVICES_INFO,
          LayerEncoder<protobuf.d2m.GetDevicesInfoEncodable>
      >
    | D2mMessage<D2mPayloadType.DROP_DEVICE, LayerEncoder<protobuf.d2m.DropDeviceEncodable>>
    | D2mMessage<
          D2mPayloadType.SET_SHARED_DEVICE_DATA,
          LayerEncoder<protobuf.d2m.SetSharedDeviceDataEncodable>
      >
    | D2mMessage<
          D2mPayloadType.BEGIN_TRANSACTION,
          LayerEncoder<protobuf.d2m.BeginTransactionEncodable>
      >
    | D2mMessage<
          D2mPayloadType.COMMIT_TRANSACTION,
          LayerEncoder<protobuf.d2m.CommitTransactionEncodable>
      >
    | D2mMessage<D2mPayloadType.REFLECT, LayerEncoder<structbuf.d2m.payload.ReflectEncodable>>
    | D2mMessage<
          D2mPayloadType.REFLECTED_ACK,
          LayerEncoder<structbuf.d2m.payload.ReflectedAckEncodable>
      >;

export type OutboundL4D2mTransactionMessage =
    | D2mMessage<
          D2mPayloadType.BEGIN_TRANSACTION,
          LayerEncoder<protobuf.d2m.BeginTransactionEncodable>
      >
    | D2mMessage<
          D2mPayloadType.COMMIT_TRANSACTION,
          LayerEncoder<protobuf.d2m.CommitTransactionEncodable>
      >;

// Task Messages (messages that are no protocol control messages)
export type InboundTaskMessage = InboundCspTaskMessage | InboundD2mTaskMessage;
export type InboundCspTaskMessage = CspMessage<
    | CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.LegacyMessage>
    | CspPayload<CspPayloadType.ALERT, structbuf.csp.payload.Alert>
    | CspPayload<CspPayloadType.CLOSE_ERROR, structbuf.csp.payload.CloseError>
>;
export type InboundD2mTaskMessage =
    | D2mMessage<D2mPayloadType.DEVICES_INFO, protobuf.d2m.DevicesInfo>
    | D2mMessage<D2mPayloadType.REFLECTED, structbuf.d2m.payload.Reflected>;

/**
 * The union of all messages that may be sent by a passive task.
 *
 * This includes:
 *
 * - Acks (both CSP and D2M)
 */
export type OutboundPassiveTaskMessage =
    | D2mMessage<
          D2mPayloadType.REFLECTED_ACK,
          LayerEncoder<structbuf.d2m.payload.ReflectedAckEncodable>
      >
    | CspMessage<
          CspPayload<
              CspPayloadType.INCOMING_MESSAGE_ACK,
              LayerEncoder<structbuf.csp.payload.MessageAckEncodable>
          >
      >;

/**
 * Chat server protocol end-to-end encrypted message type.
 */
export type CspE2eType =
    | CspE2eConversationType
    | CspE2eStatusUpdateType
    | CspE2eGroupControlType
    | CspE2eContactControlType
    | CspE2eGroupConversationType
    | CspE2eGroupStatusUpdateType
    | CspE2eForwardSecurityType;
export const CSP_E2E_TYPE_NAME_OF = {
    ...CspE2eConversationTypeUtils.NAME_OF,
    ...CspE2eStatusUpdateTypeUtils.NAME_OF,
    ...CspE2eGroupControlTypeUtils.NAME_OF,
    ...CspE2eContactControlTypeUtils.NAME_OF,
    ...CspE2eGroupConversationTypeUtils.NAME_OF,
    ...CspE2eGroupStatusUpdateTypeUtils.NAME_OF,
    ...CspE2eForwardSecurityTypeUtils.NAME_OF,
} as const;
export function cspE2eTypeNameOf<T extends u53>(value: T): string | undefined {
    return (CSP_E2E_TYPE_NAME_OF as Record<u53, string | undefined>)[value];
}
/**
 * Validate number is a valid {@link CspE2eType}.
 */
export function isCspE2eType(value: u53): value is CspE2eType {
    return cspE2eTypeNameOf(value) !== undefined;
}
/**
 * Ensure number is a valid {@link CspE2eType}.
 *
 * @throws {Error} if the value is invalid.
 */
export function ensureCspE2eType(value: u53): CspE2eType {
    if (!isCspE2eType(value)) {
        throw new Error(`Value ${value} is not a valid CSP E2E message type`);
    }
    return value;
}

/**
 * A mapping of the protocol-specific numeric payload type to the high-level string-based message
 * type.
 */
export interface CspE2eTypeToMessageType {
    [CspE2eConversationType.TEXT]: MessageType.TEXT;
    [CspE2eConversationType.FILE]: MessageType.FILE;
}

/**
 * A list of all types in {@link CspE2eType} that are reflected.
 *
 * Example: A contact "set profile picture" message is *not* reflected, so it is not a valid
 * subtype.
 */
export type ReflectedE2eType = Exclude<CspE2eType, CspE2eContactControlType>;
