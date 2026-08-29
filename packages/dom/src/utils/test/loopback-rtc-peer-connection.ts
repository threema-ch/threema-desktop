/**
 * A pair of connected `RTCPeerConnection`s, as created by {@link createLoopbackRtcPeerConnection}.
 */
export interface LoopbackRtcPeerConnection {
    /**
     * The track as it arrives on the receiving side, i.e. a genuine remote track.
     */
    readonly remoteTrack: MediaStreamTrack;
    /**
     * Closes both connections, which ends the remote track.
     */
    readonly close: () => void;
}

/**
 * Sends a track through a connection to a second one in the same page, so that a test can observe a
 * real remote track.
 *
 * The platform reports a receiving track as muted until media actually flows, and it ends such a
 * track when the connection goes away. Neither is reproducible with a local track, which is why
 * this loopback helper can come in handy for certain test cases.
 *
 * @param track Track to send, e.g. a camera track from `getUserMedia`.
 * @returns The handle of the loopback. Note: {@link LoopbackRtcPeerConnection.close} must be called
 *   at the end of the test, because a connection is not collected while it is connected.
 */
export async function createLoopbackRtcPeerConnection(
    track: MediaStreamTrack,
): Promise<LoopbackRtcPeerConnection> {
    const sender = new RTCPeerConnection();
    const receiver = new RTCPeerConnection();

    /**
     * Hands a candidate to the other side.
     *
     * Note: A candidate which arrives before the other side has its remote description is rejected
     * by the platform. The connection still forms from the remaining candidates, so such a failure
     * is ignored deliberately.
     */
    function forwardCandidate(to: RTCPeerConnection, candidate: RTCIceCandidate): void {
        to.addIceCandidate(candidate).catch(() => undefined);
    }

    sender.addEventListener('icecandidate', ({candidate}) => {
        if (candidate !== null) {
            forwardCandidate(receiver, candidate);
        }
    });
    receiver.addEventListener('icecandidate', ({candidate}) => {
        if (candidate !== null) {
            forwardCandidate(sender, candidate);
        }
    });

    const remoteTrack = new Promise<MediaStreamTrack>((resolve) => {
        receiver.addEventListener('track', (event) => {
            resolve(event.track);
        });
    });

    sender.addTrack(track, new MediaStream([track]));

    const offer = await sender.createOffer();
    await sender.setLocalDescription(offer);
    await receiver.setRemoteDescription(offer);
    const answer = await receiver.createAnswer();
    await receiver.setLocalDescription(answer);
    await sender.setRemoteDescription(answer);

    return {
        remoteTrack: await remoteTrack,
        close: () => {
            sender.close();
            receiver.close();
        },
    };
}
