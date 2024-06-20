// See: https://w3c.github.io/webrtc-encoded-transform

// All of this is non-standard and already deprecated but RTCRtpScriptTransform is not available in
// Chromium, yet.
//
// https://caniuse.com/mdn-api_rtcrtpscripttransform

interface RTCRtpSender {
    createEncodedStreams: () => TransformStream;
}

interface RTCRtpReceiver {
    createEncodedStreams: () => TransformStream;
}

interface RTCConfiguration {
    encodedInsertableStreams?: boolean;
}
