import type {ByteLengthEncoder} from '@threema/ts-utils/byte/byte-encoder';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

import {
    CspE2eContactControlType,
    CspE2eContactControlTypeUtils,
    CspE2eConversationType,
    CspE2eConversationTypeUtils,
    CspE2eForwardSecurityType,
    CspE2eForwardSecurityTypeUtils,
    CspE2eGroupControlType,
    CspE2eGroupControlTypeUtils,
    CspE2eGroupConversationType,
    CspE2eGroupConversationTypeUtils,
    CspE2eGroupMessageUpdateType,
    CspE2eGroupMessageUpdateTypeUtils,
    CspE2eGroupMessageReactionType,
    CspE2eGroupMessageReactionTypeUtils,
    CspE2eGroupStatusUpdateType,
    CspE2eGroupStatusUpdateTypeUtils,
    CspE2eMessageReactionType,
    CspE2eMessageReactionTypeUtils,
    CspE2eMessageUpdateType,
    CspE2eMessageUpdateTypeUtils,
    CspE2eStatusUpdateType,
    CspE2eStatusUpdateTypeUtils,
    CspE2eWebSessionResumeType,
    CspE2eWebSessionResumeTypeUtils,
    CspE2eWorkSyncDeltaType,
    CspExtensionType,
    CspMessageFlag,
    CspPayloadType,
    D2mPayloadType,
    type ReceiverType,
    CspE2eWorkSyncDeltaTypeUtils,
} from '~/common/enum';
import type * as protobuf from '~/common/network/protobuf';
import type * as structbuf from '~/common/network/structbuf';

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
    | CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.MessageWithMetadataBox>
    | CspPayload<CspPayloadType.OUTGOING_MESSAGE_ACK, structbuf.csp.payload.MessageAck>
    | CspPayload<CspPayloadType.CLOSE_ERROR, structbuf.csp.payload.CloseError>
    | CspPayload<CspPayloadType.ALERT, structbuf.csp.payload.Alert>
    | CspPayload<
          CspPayloadType.DEVICE_COOKIE_CHANGED_INDICATION,
          structbuf.csp.payload.DeviceCookieChangeIndication
      >
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
          LayerEncoder<structbuf.csp.payload.MessageWithMetadataBoxEncodable>
      >
    | CspPayload<
          CspPayloadType.INCOMING_MESSAGE_ACK,
          LayerEncoder<structbuf.csp.payload.MessageAckEncodable>
      >
    | CspPayload<
          CspPayloadType.SET_CONNECTION_IDLE_TIMEOUT,
          LayerEncoder<structbuf.csp.payload.SetConnectionIdleTimeoutEncodable>
      >
    | CspPayload<
          CspPayloadType.CLEAR_DEVICE_COOKIE_CHANGED_INDICATION,
          LayerEncoder<structbuf.csp.payload.ClearDeviceCookieChangeIndicationEncodable>
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
export type InboundBackloggableL4Message = Exclude<
    InboundL4Message,
    D2mMessage<D2mPayloadType.REFLECTED, structbuf.d2m.payload.Reflected>
>;
export type InboundL4CspMessage = CspMessage<
    | CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.MessageWithMetadataBox>
    | CspPayload<CspPayloadType.OUTGOING_MESSAGE_ACK, structbuf.csp.payload.MessageAck>
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
          LayerEncoder<structbuf.csp.payload.MessageWithMetadataBoxEncodable>
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

export type InboundDropDeviceLayerMessage = D2mMessage<
    D2mPayloadType.DROP_DEVICE_ACK,
    protobuf.d2m.DropDeviceAck
>;

export type OutboundDropDeviceLayerMessage = D2mMessage<
    D2mPayloadType.DROP_DEVICE,
    LayerEncoder<protobuf.d2m.DropDeviceEncodable>
>;
// Task Messages (messages that are no protocol control messages)
export type InboundTaskMessage = InboundCspTaskMessage | InboundD2mTaskMessage;
export type InboundCspTaskMessage = CspMessage<
    CspPayload<CspPayloadType.INCOMING_MESSAGE, structbuf.csp.payload.MessageWithMetadataBox>
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
    | CspE2eContactControlType
    | CspE2eGroupConversationType
    | CspE2eGroupStatusUpdateType
    | CspE2eGroupControlType
    | CspE2eForwardSecurityType
    | CspE2eWorkSyncDeltaType
    | CspE2eWebSessionResumeType
    | CspE2eMessageUpdateType
    | CspE2eGroupMessageUpdateType
    | CspE2eMessageReactionType
    | CspE2eGroupMessageReactionType;
export const CSP_E2E_TYPE_NAME_OF = {
    ...CspE2eConversationTypeUtils.NAME_OF,
    ...CspE2eStatusUpdateTypeUtils.NAME_OF,
    ...CspE2eContactControlTypeUtils.NAME_OF,
    ...CspE2eGroupConversationTypeUtils.NAME_OF,
    ...CspE2eGroupStatusUpdateTypeUtils.NAME_OF,
    ...CspE2eGroupControlTypeUtils.NAME_OF,
    ...CspE2eForwardSecurityTypeUtils.NAME_OF,
    ...CspE2eWorkSyncDeltaTypeUtils.NAME_OF,
    ...CspE2eWebSessionResumeTypeUtils.NAME_OF,
    ...CspE2eMessageUpdateTypeUtils.NAME_OF,
    ...CspE2eGroupMessageUpdateTypeUtils.NAME_OF,
    ...CspE2eMessageReactionTypeUtils.NAME_OF,
    ...CspE2eGroupMessageReactionTypeUtils.NAME_OF,
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
 * Return {@link ReceiverType.GROUP} for group message types, and {@link ReceiverType.CONTACT} otherwise.
 */
export type ReceiverTypeForCspE2eMessageType<T extends CspE2eType> =
    T extends CspE2eGroupConversationType
        ? ReceiverType.GROUP
        : T extends CspE2eGroupStatusUpdateType
          ? ReceiverType.GROUP
          : T extends CspE2eGroupControlType
            ? ReceiverType.GROUP
            : T extends CspE2eGroupMessageUpdateType
              ? ReceiverType.GROUP
              : T extends CspE2eGroupMessageReactionType
                ? ReceiverType.GROUP
                : ReceiverType.CONTACT;

/**
 * A list of all types in {@link CspE2eType} that are reflected.
 *
 * Right now, this is identical to {@link CspE2eType} because we reflect all message types.
 */
export type ReflectedE2eType = CspE2eType;

/**
 * Properties for a CSP E2E message.
 */
export interface MessageTypeProperties<TReceiverType extends ReceiverType> {
    /**
     * Should the user profile distribution be triggered by an outgoing message of this type?
     *
     * If set to 'it-depends', then custom logic is needed depending on the message contents.
     */
    readonly userProfileDistribution: boolean | 'it-depends';

    /**
     * Should this message be sent or processed even if the sender or receiver is blocked?
     *
     * If set to 'dedicated_steps', then custom logic is needed depending on the message contents.
     */
    readonly exemptFromBlocking: boolean | 'dedicated_steps';

    /**
     * Should this message be reflected to other devices and should this message reflect a `sent`
     * update when outgoing?
     */
    readonly reflect: {
        readonly incoming: boolean;
        readonly outgoing: boolean;
        readonly outgoingSentUpdate: boolean;
    };

    /**
     * Send group messages to Threema Gateway ID group creator?
     */
    readonly sendToGatewayGroupCreator: TReceiverType extends ReceiverType.GROUP
        ? 'if-captured' | 'always' | 'not-applicable'
        : 'not-applicable';

    /**
     * Should this message cause a bump of `lastUpdate` (i.e., set the conversation's last update
     * timestamp to the current timestamp)?
     *
     * If set to 'it-depends', then custom logic is needed depending on the message contents.
     */
    readonly bumpLastUpdate: boolean | 'it-depends';
}

type MessageTypePropertiesMap = {
    readonly [K in CspE2eType]: MessageTypeProperties<ReceiverTypeForCspE2eMessageType<K>>;
};

/**
 * A map of all message types along with their {@link MessageTypeProperties}
 */
export const MESSAGE_TYPE_PROPERTIES: MessageTypePropertiesMap = {
    // Contact conversation messages
    [CspE2eConversationType.TEXT]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.DEPRECATED_IMAGE]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.LOCATION]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.DEPRECATED_AUDIO]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.DEPRECATED_VIDEO]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.FILE]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.POLL_SETUP]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.POLL_VOTE]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eConversationType.CALL_OFFER]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: true,
    },
    [CspE2eConversationType.CALL_ANSWER]: {
        userProfileDistribution: 'it-depends', // This should be true when accepting
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eConversationType.CALL_ICE_CANDIDATE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eConversationType.CALL_HANGUP]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: 'it-depends',
    },
    [CspE2eConversationType.CALL_RINGING]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    // Contact status updates
    [CspE2eStatusUpdateType.DELIVERY_RECEIPT]: {
        userProfileDistribution: 'it-depends',
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eStatusUpdateType.TYPING_INDICATOR]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    // Contact control messages
    [CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eContactControlType.CONTACT_REQUEST_PROFILE_PICTURE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    // Group conversation messages
    [CspE2eGroupConversationType.GROUP_TEXT]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_LOCATION]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_AUDIO]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_VIDEO]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_FILE]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_POLL_SETUP]: {
        userProfileDistribution: true,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: true,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: true,
    },
    [CspE2eGroupConversationType.GROUP_POLL_VOTE]: {
        userProfileDistribution: true,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: false,
    },

    // Group status updates
    [CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT]: {
        userProfileDistribution: 'it-depends',
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: false,
    },

    // Group control messages
    [CspE2eGroupControlType.GROUP_SETUP]: {
        userProfileDistribution: true,
        exemptFromBlocking: 'dedicated_steps',
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_NAME]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_LEAVE]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'always',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_SYNC_REQUEST]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'always',
        bumpLastUpdate: false,
    },
    [CspE2eGroupControlType.GROUP_CALL_START]: {
        userProfileDistribution: true,
        exemptFromBlocking: true,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        // TODO(SE-508): Update this as soon as it's specified in the protocol.
        bumpLastUpdate: 'it-depends',
    },

    // Forward security messages
    //
    // Note: Properties are not currently specified in the protocol for forward security envelopes!
    //       Set sensible defaults. Might need to be updated if the protocol changes (probably once
    //       SE-358 is implemented).
    [CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE]: {
        userProfileDistribution: 'it-depends',
        exemptFromBlocking: false,
        reflect: {
            incoming: false,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: 'it-depends',
    },

    [CspE2eWorkSyncDeltaType.WORK_SYNC_DELTA]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: false,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    // Push control
    [CspE2eWebSessionResumeType.WEB_SESSION_RESUME]: {
        userProfileDistribution: false,
        exemptFromBlocking: true,
        reflect: {
            incoming: false,
            outgoing: false,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },
    [CspE2eMessageUpdateType.EDIT_MESSAGE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    [CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: false,
    },

    [CspE2eMessageUpdateType.DELETE_MESSAGE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    [CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE]: {
        userProfileDistribution: false,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: false,
    },

    [CspE2eMessageReactionType.REACTION]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'not-applicable',
        bumpLastUpdate: false,
    },

    [CspE2eGroupMessageReactionType.GROUP_REACTION]: {
        userProfileDistribution: true,
        exemptFromBlocking: false,
        reflect: {
            incoming: true,
            outgoing: true,
            outgoingSentUpdate: false,
        },
        sendToGatewayGroupCreator: 'if-captured',
        bumpLastUpdate: false,
    },
};

export interface MessageTypeEncoders {
    // Contact conversation messages
    [CspE2eConversationType.TEXT]: structbuf.csp.e2e.TextEncodable;
    [CspE2eConversationType.DEPRECATED_IMAGE]: structbuf.csp.e2e.DeprecatedImageEncodable;
    [CspE2eConversationType.LOCATION]: structbuf.csp.e2e.LocationEncodable;
    [CspE2eConversationType.DEPRECATED_AUDIO]: structbuf.csp.e2e.DeprecatedAudioEncodable;
    [CspE2eConversationType.DEPRECATED_VIDEO]: structbuf.csp.e2e.DeprecatedVideoEncodable;
    [CspE2eConversationType.FILE]: structbuf.csp.e2e.FileEncodable;
    [CspE2eConversationType.POLL_SETUP]: structbuf.csp.e2e.PollSetupEncodable;
    [CspE2eConversationType.POLL_VOTE]: structbuf.csp.e2e.PollVoteEncodable;
    [CspE2eConversationType.CALL_OFFER]: structbuf.csp.e2e.CallOfferEncodable;
    [CspE2eConversationType.CALL_ANSWER]: structbuf.csp.e2e.CallAnswerEncodable;
    [CspE2eConversationType.CALL_ICE_CANDIDATE]: structbuf.csp.e2e.CallIceCandidateEncodable;
    [CspE2eConversationType.CALL_HANGUP]: structbuf.csp.e2e.CallHangupEncodable;
    [CspE2eConversationType.CALL_RINGING]: structbuf.csp.e2e.CallRingingEncodable;

    // Contact status updates
    [CspE2eStatusUpdateType.DELIVERY_RECEIPT]: structbuf.csp.e2e.DeliveryReceiptEncodable;
    [CspE2eStatusUpdateType.TYPING_INDICATOR]: structbuf.csp.e2e.TypingIndicatorEncodable;

    // Message Reactions
    [CspE2eMessageReactionType.REACTION]: protobuf.csp_e2e.ReactionEncodable;

    // Message Updates
    [CspE2eMessageUpdateType.EDIT_MESSAGE]: protobuf.csp_e2e.EditMessageEncodable;
    [CspE2eMessageUpdateType.DELETE_MESSAGE]: protobuf.csp_e2e.DeleteMessageEncodable;

    // Contact control messages
    [CspE2eContactControlType.CONTACT_SET_PROFILE_PICTURE]: structbuf.csp.e2e.SetProfilePictureEncodable;
    [CspE2eContactControlType.CONTACT_DELETE_PROFILE_PICTURE]: structbuf.csp.e2e.DeleteProfilePictureEncodable;
    [CspE2eContactControlType.CONTACT_REQUEST_PROFILE_PICTURE]: structbuf.csp.e2e.ContactRequestProfilePictureEncodable;

    // Group conversation messages
    [CspE2eGroupConversationType.GROUP_TEXT]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_LOCATION]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_AUDIO]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_VIDEO]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_FILE]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_POLL_SETUP]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupConversationType.GROUP_POLL_VOTE]: structbuf.csp.e2e.GroupMemberContainerEncodable;

    // Group message updates
    [CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE]: structbuf.csp.e2e.GroupMemberContainerEncodable;

    // Group message reactions
    [CspE2eGroupMessageReactionType.GROUP_REACTION]: structbuf.csp.e2e.GroupMemberContainerEncodable;

    // Group status updates
    [CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT]: structbuf.csp.e2e.GroupMemberContainerEncodable;

    // Group control messages
    [CspE2eGroupControlType.GROUP_SETUP]: structbuf.csp.e2e.GroupCreatorContainerEncodable;
    [CspE2eGroupControlType.GROUP_NAME]: structbuf.csp.e2e.GroupCreatorContainerEncodable;
    [CspE2eGroupControlType.GROUP_LEAVE]: structbuf.csp.e2e.GroupMemberContainerEncodable;
    [CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE]: structbuf.csp.e2e.GroupCreatorContainerEncodable;
    [CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE]: structbuf.csp.e2e.GroupCreatorContainerEncodable;
    [CspE2eGroupControlType.GROUP_SYNC_REQUEST]: structbuf.csp.e2e.GroupCreatorContainerEncodable;
    [CspE2eGroupControlType.GROUP_CALL_START]: structbuf.csp.e2e.GroupMemberContainerEncodable;

    // Forward security messages
    [CspE2eForwardSecurityType.FORWARD_SECURITY_ENVELOPE]: protobuf.csp_e2e_fs.EnvelopeEncodable;

    // Web session resume
    [CspE2eWebSessionResumeType.WEB_SESSION_RESUME]: structbuf.csp.e2e.WebSessionResume;

    // Work sync delta
    [CspE2eWorkSyncDeltaType.WORK_SYNC_DELTA]: protobuf.csp_e2e.WorkSyncDeltaEncodable;
}
