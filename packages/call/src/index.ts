// Shared, platform-neutral implementation of the Threema call protocol.
// This entry point contains no DOM, WebWorker, Node or Electron APIs — only plain TypeScript. Code
// that needs WebWorker APIs is available through the `@threema/call/worker` entry point.

export {
    ensureParticipantId,
    getMids,
    isParticipantId,
    MIDS_MAX,
    type ParticipantId,
} from './participant.js';
