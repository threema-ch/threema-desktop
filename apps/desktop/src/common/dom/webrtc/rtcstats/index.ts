/**
 * Integration of rtcstats (https://github.com/rtcstats/rtcstats) for Threema calls.
 *
 * When enabled, the `@rtcstats/rtcstats-js` wrappers are installed on the global
 * `RTCPeerConnection`, `getUserMedia` and `enumerateDevices` APIs. All WebRTC API calls, events and
 * periodic `getStats()` snapshots (delta-compressed) are then recorded into a local IndexedDB (see
 * {@link IndexedDbTrace}), grouped into one session per group call.
 *
 * The recorded sessions can be exported manually as `RTCStatsDump` JSONL files from the "Call
 * Statistics" section of the about settings page. No data is ever sent anywhere automatically.
 */

import {wrapEnumerateDevices, wrapGetUserMedia, wrapRTCPeerConnection} from '@rtcstats/rtcstats-js';

import {
    createRtcStatsSessionId,
    IndexedDbTrace,
    type RtcStatsSessionId,
} from '~/common/dom/webrtc/rtcstats/trace-indexeddb';
import type {LoggerFactory} from '~/common/logging';
import type {u53} from '~/common/types';
import {assert} from '~/common/utils/assert';

/**
 * Interval at which rtcstats polls {@link RTCPeerConnection.getStats}. Since the results are
 * delta-compressed, the entries are small in steady state, so this may be considerably more
 * frequent than the 5s interval of the curated `GroupCallStatsCollector`.
 */
const GET_STATS_INTERVAL_MS: u53 = 2_000;

/**
 * Handle to the installed rtcstats integration.
 */
export interface RtcStatsHandle {
    /** Start a new trace session, see {@link IndexedDbTrace.startSession}. */
    readonly startSession: (sessionId: RtcStatsSessionId) => void;
    /** Record a custom trace entry (e.g. call end markers). */
    readonly trace: (event: string, peerConnectionId: string | undefined, data: unknown) => void;
    /** Enable or disable recording (the API wrappers stay installed until restart). */
    readonly setEnabled: (enabled: boolean) => void;
}

/**
 * Install the rtcstats API wrappers on {@link window} and start an initial trace session.
 *
 * Must be called in the renderer (DOM context, where `RTCPeerConnection` and IndexedDB are
 * available), before any peer connection is created. The wrappers are only installed once the trace
 * database was opened successfully.
 *
 * Never rejects: When installation fails, the returned promise resolves to `undefined` and WebRTC
 * functionality remains unaffected.
 */
export async function initRtcStats(logging: LoggerFactory): Promise<RtcStatsHandle | undefined> {
    const log = logging.logger('rtcstats');
    try {
        const trace = await IndexedDbTrace.create(log);

        // Note: The wrappers preserve the original `RTCPeerConnection` prototype, so the
        // non-standard `createEncodedStreams` API used for group calls (see
        // `webrtc-patches.d.ts`) keeps working. `getDisplayMedia` is traced by
        // `wrapGetUserMedia` as well.
        wrapRTCPeerConnection(trace.trace, window, {getStatsInterval: GET_STATS_INTERVAL_MS});
        wrapGetUserMedia(trace.trace, window);
        wrapEnumerateDevices(trace.trace, window);

        // The group call setup uses the static `RTCPeerConnection.generateCertificate`, which the
        // wrapper is expected to preserve (rtcstats-js explicitly copies it). If a future rtcstats
        // version regressed this, group calls would fail outright.
        assert(
            typeof (window.RTCPeerConnection as {generateCertificate?: unknown})
                .generateCertificate === 'function',
            'rtcstats wrapper did not preserve RTCPeerConnection.generateCertificate',
        );

        trace.startSession(createRtcStatsSessionId('app-start'));
        log.info('rtcstats tracing installed');
        return {
            startSession: (sessionId) => trace.startSession(sessionId),
            trace: (event, peerConnectionId, data) => trace.trace(event, peerConnectionId, data),
            setEnabled: (enabled) => trace.setEnabled(enabled),
        };
    } catch (error) {
        log.error('Installing rtcstats tracing failed', error);
        return undefined;
    }
}
