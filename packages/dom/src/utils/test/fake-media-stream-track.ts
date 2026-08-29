/**
 * A `MediaStreamTrack` whose state can be driven by a test, as provided by
 * {@link createFakeMediaStreamTrack}.
 */
export interface FakeMediaStreamTrack {
    /**
     * The track itself, to be passed to the code under test.
     */
    readonly track: MediaStreamTrack;
    /**
     * Stops media from arriving, as the platform does when a source stops delivering, i.e. sets
     * `muted` and fires a `mute` event.
     */
    readonly mute: () => void;
    /**
     * Lets media arrive again, i.e. clears `muted` and fires an `unmute` event.
     */
    readonly unmute: () => void;
    /**
     * Ends the track, i.e. sets `readyState` to `'ended'` and fires an `ended` event.
     *
     * Note: The platform does not fire `ended` for a track which was stopped locally, but it does
     * for one which ended on its own, which is the case worth testing.
     */
    readonly end: () => void;
}

/**
 * Creates a fake track, for the transitions the platform will not perform on demand.
 *
 * A real track is the better test subject wherever one can be had, i.e. from `getUserMedia` or from
 * a loopback connection, because the platform's own behaviour is the thing worth asserting. It
 * cannot be made to stall a live track on request, though, which is what this covers.
 *
 * @param initial.isMuted Whether the track starts out muted, i.e. with no media arriving yet.
 *   Defaults to `false`, which is how a local track arrives.
 * @returns The handle of the fake.
 */
export function createFakeMediaStreamTrack(initial?: {
    readonly isMuted?: boolean;
}): FakeMediaStreamTrack {
    const target = new EventTarget();

    let muted = initial?.isMuted ?? false;
    let readyState: MediaStreamTrackState = 'live';

    const track = {
        addEventListener: target.addEventListener.bind(target),
        dispatchEvent: target.dispatchEvent.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        get muted() {
            return muted;
        },
        get readyState() {
            return readyState;
        },
        // Note: Cast because a `MediaStreamTrack` cannot be constructed, and only the members which
        // are actually observed in tests are implemented.
    } as unknown as MediaStreamTrack;

    function dispatch(type: 'mute' | 'unmute' | 'ended'): void {
        target.dispatchEvent(new Event(type));
    }

    return {
        track,
        mute: () => {
            muted = true;
            dispatch('mute');
        },
        unmute: () => {
            muted = false;
            dispatch('unmute');
        },
        end: () => {
            readyState = 'ended';
            dispatch('ended');
        },
    };
}
