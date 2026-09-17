// Shared, platform-neutral implementation of the Threema call protocol.
// This entry point contains no DOM, WebWorker, Node or Electron APIs — only plain TypeScript. Code
// that needs WebWorker APIs is available through the `@threema/call/worker` entry point.

export {
    createGroupCallId,
    deriveGroupCallId,
    type GroupCallId,
    type GroupCallIdProperties,
    type GroupCallIdValue,
} from './call-id.js';

export {
    CALL_PERSONAL,
    deriveGroupCallKeys,
    ensureRawGroupCallKeyHash,
    GROUP_CALL_KEY_LENGTH,
    type GroupCallHandshakeKeyBox,
    type GroupCallKeys,
    type GroupCallStateKeyBox,
    type RawGroupCallKey,
    type RawGroupCallKeyHash,
    wrapRawGroupCallKey,
} from './key.js';

export {
    alignMediaKeyStateWith,
    ensureMediaKeySuccessorState,
    LocalParticipantCallMediaKey,
    PCMK_LENGTH,
    type ParticipantCallMediaKeyState,
    type PendingParticipantCallMediaKeyState,
    type RawParticipantCallMediaKey,
    type RawParticipantCallMediaKeyState,
} from './media-key.js';

export {
    ensureParticipantId,
    getMids,
    isParticipantId,
    MIDS_MAX,
    type ParticipantId,
} from './participant.js';

export {
    deriveGroupCallNormalHandshakeAuthKey,
    type GroupCallNormalHandshakeAuthBox,
    type LocalParticipantCallKey,
    type LocalParticipantCookie,
    type LocalParticipantSequenceNumberValue,
    type ParticipantCallBox,
    type RemoteParticipantCallKey,
    type RemoteParticipantCookie,
    type RemoteParticipantSequenceNumberValue,
    type SharedKeyDeriver,
} from './participant-channel.js';

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
} from './schema.js';

export {SfuSupportedFeatures, type SfuSupportedFeaturesInterface} from './sfu.js';
