// Note: The group call validation schemas live in `@threema/call` so that both apps decode SFU
// traffic the same way. They are re-exported here to keep the existing import sites working.
//
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {
    CALL_STATE_SNAPSHOT_SCHEMA,
    JOIN_RESPONSE_SCHEMA,
    P2P_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA,
    PEEK_RESPONSE_SCHEMA,
    S2P_ENVELOPE_SCHEMA,
    type JoinResponse,
    type P2pOuterEnvelope,
    type PeekCallStateSnapshot,
    type PeekResponse,
    type S2pEnvelope,
    type S2pHello,
} from '@threema/call';
