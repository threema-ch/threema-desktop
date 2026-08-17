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

export {SfuSupportedFeatures, type SfuSupportedFeaturesInterface} from './sfu.js';
