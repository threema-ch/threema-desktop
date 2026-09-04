import type {EnumerableMediaDevice, EnumerableMediaDeviceSelection} from './media-device';
import type {MediaDeviceError} from './media-device-error';
import type {MediaDeviceId} from './media-device-id';

/**
 * Hardware capture state of a `LocalCaptureSource`.
 *
 * Note: Only represents acquisition state of a source. Whether its track is actually delivering
 * media is controlled by {@link LocalCaptureState.isEnabled}.
 */
export type LocalCapture =
    | {
          /**
           * No hardware is held.
           */
          readonly status: 'inactive';
      }
    | {
          /**
           * Hardware is being opened for the first time. Note: Replacing one acquired device with
           * another stays in `'acquired'`.
           */
          readonly status: 'acquiring';
      }
    | {
          /**
           * Hardware is held. Note: Whether its track actually delivers media is a separate state,
           * answered by {@link LocalCaptureState.isEnabled}.
           */
          readonly status: 'acquired';
          /**
           * Note: The identity of this stream is stable for as long as the source keeps its
           * hardware, including across a change of device, so it can be attached to an element once
           * and left alone. The track inside it is replaced instead.
           */
          readonly stream: MediaStream;
          readonly track: MediaStreamTrack;
      }
    | {
          /**
           * The last attempt to open the hardware did not succeed. No hardware is held, and the
           * failure is reported until the source is asked to try again.
           */
          readonly status: 'failed';
          readonly error: MediaDeviceError;
      };

/**
 * State of a local media capture source.
 */
export interface LocalCaptureState {
    /**
     * Whether the consumer asked for this source to deliver media. Intended to be rendered in the
     * UI, because it follows an interaction immediately, while the hardware may still be catching
     * up.
     */
    readonly isEnabled: boolean;
    /**
     * Whether the hardware is currently catching up, i.e. being opened, replaced or released. *Not*
     * intended to be rendered in the UI, because switching between underlying devices is
     * represented in this state.
     */
    readonly isPending: boolean;
    readonly capture: LocalCapture;
}

/**
 * State of a local media capture source which has multiple underlying devices to choose from.
 */
export interface LocalSelectableCaptureState extends LocalCaptureState {
    /**
     * The devices of this source's kind, in the order the platform reported them.
     */
    readonly devices: readonly EnumerableMediaDevice[];
    /**
     * The device selection request which is currently applied on this source.
     */
    readonly selection: EnumerableMediaDeviceSelection;
    /**
     * Which of the {@link devices} the {@link selection} points at, or `undefined` if the system
     * decides, which is the case when the system default was asked for, and when the device the
     * selection names is not present.
     */
    readonly selected: EnumerableMediaDevice | undefined;
    /**
     * Which device the platform actually opened, or `undefined` if none is open or the platform
     * withheld its identifier. Note: This can differ from {@link selected}, because a device can
     * disappear between being chosen and being opened, in which case the capture falls back to the
     * system default, while the selection persists.
     */
    readonly effective: MediaDeviceId | undefined;
}

/**
 * A sink which supports attaching multiple tracks.
 *
 * Note: The tracks connected here are mixed into one, so that the chosen speaker applies to all of
 * them at once rather than to each separately.
 */
export interface MediaSink {
    /**
     * Adds a track to the mix. Connecting a track which is already connected does nothing.
     */
    readonly connect: (track: MediaStreamTrack) => void;
    /**
     * Removes a track from the mix. Disconnecting a track which is not connected does nothing.
     */
    readonly disconnect: (track: MediaStreamTrack) => void;
}

/**
 * State of a local speaker destination.
 */
export interface LocalSelectableSinkState {
    /**
     * The speakers, or empty if the platform cannot direct audio at a chosen one, in which case
     * there is nothing to offer and the system decides.
     */
    readonly devices: readonly EnumerableMediaDevice[];
    /**
     * The device selection request which is currently applied on this destination.
     */
    readonly selection: EnumerableMediaDeviceSelection;
    /**
     * Which of the {@link devices} the {@link selection} points at, or `undefined` if the system
     * decides, which is the case when the system default was asked for, and when the device the
     * selection names is not present.
     */
    readonly selected: EnumerableMediaDevice | undefined;
    /**
     * Which underlying device the audio is currently directed at, or `undefined` if the system
     * decides.
     */
    readonly effective: MediaDeviceId | undefined;
    /**
     * Whether the platform lets the audio play. It withholds playback until the user interacted
     * with the page.
     */
    readonly playback: 'playing' | 'blocked';
    /**
     * The sink for attaching tracks to this destination. Stable for the lifetime of the manager, so
     * tracks can be connected before the platform lets them be heard.
     */
    readonly sink: MediaSink;
}

/**
 * State of local media devices on the machine.
 */
export interface LocalDevicesState {
    readonly camera: LocalSelectableCaptureState;
    readonly display: LocalCaptureState;
    readonly microphone: LocalSelectableCaptureState;
    readonly speaker: LocalSelectableSinkState;
}
