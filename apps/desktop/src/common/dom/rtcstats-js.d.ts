/**
 * Type declarations for the untyped `@rtcstats/rtcstats-js` package (only the subset used by this
 * application is declared).
 *
 * See https://github.com/rtcstats/rtcstats (packages/rtcstats-js).
 */
declare module '@rtcstats/rtcstats-js' {
    /**
     * Trace callback invoked by the rtcstats wrappers.
     *
     * Called with a method/event name, the associated peer connection id (or `null`/`undefined`
     * when not related to a peer connection), the associated data, and optional extra correlation
     * arguments (e.g. a tracking id).
     */
    type RtcStatsTraceFunction = (
        method: string,
        // eslint-disable-next-line @typescript-eslint/no-restricted-types
        peerConnectionId: string | null | undefined,
        value: unknown,
        ...extra: unknown[]
    ) => void;

    /**
     * Replace `window.RTCPeerConnection` (and the `RTCRtpSender` / `RTCRtpTransceiver`
     * prototypes) with wrappers that report all API calls and events to `trace`, and poll
     * `getStats()` every `getStatsInterval` milliseconds once connected. The original prototype
     * and static methods (e.g. `generateCertificate`) are preserved.
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    function wrapRTCPeerConnection(
        trace: RtcStatsTraceFunction,
        window: Window & typeof globalThis,
        configuration: {readonly getStatsInterval: number},
    ): void;

    /**
     * Wrap `navigator.mediaDevices.getUserMedia` and `getDisplayMedia` (plus some
     * `MediaStreamTrack` methods and events) to report calls to `trace`.
     */
    function wrapGetUserMedia(
        trace: RtcStatsTraceFunction,
        window: Window & typeof globalThis,
    ): void;

    /**
     * Wrap `navigator.mediaDevices.enumerateDevices` and the `devicechange` event to report
     * calls to `trace`.
     */
    function wrapEnumerateDevices(
        trace: RtcStatsTraceFunction,
        window: Window & typeof globalThis,
    ): void;
}
