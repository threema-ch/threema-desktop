import type {u53} from '@threema/ts-utils/integer/u53';
import {unreachable} from '@threema/ts-utils/meta/unreachable';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import {TimeoutError} from '@threema/ts-utils/timer/timeout-error';

import type {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import type {LocalCapture} from './local-devices-state';
import type {
    CapturableMediaDeviceKind,
    EnumerableMediaDevice,
    EnumerableMediaDeviceSelection,
} from './media-device';
import {
    MediaDeviceConstraintsError,
    type MediaDeviceError,
    MediaDeviceInUseError,
    MediaDeviceNotFoundError,
    MediaDevicePermissionDeniedByUserError,
    MediaDeviceTimeoutError,
    toMediaDeviceError,
} from './media-device-error';
import {isAliasMediaDeviceId, isMediaDeviceId, type MediaDeviceId} from './media-device-id';
import {
    CAMERA_CONSTRAINTS,
    DISPLAY_CONSTRAINTS,
    MICROPHONE_CONSTRAINTS,
} from './media-track-constraints';
import {resolveMediaDevice} from './resolve-media-device';

/**
 * How long the platform is given to hand over the hardware.
 */
export const DEFAULT_ACQUISITION_TIMEOUT_MS = 60_000;

/**
 * How many times a device may stop consecutively without any interaction by the user, before we
 * give up automatic retries.
 */
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Describes the intended target state for a local capture source.
 */
interface LocalCaptureIntent {
    /**
     * The constraints for choosing which underlying device to use.
     */
    readonly device: EnumerableMediaDeviceSelection;
    /**
     * Whether the underlying hardware should be acquired.
     */
    readonly isAcquired: boolean;
    /**
     * Whether the track should deliver media, rather than be silenced.
     */
    readonly isEnabled: boolean;
}

/**
 * The outcome of an attempt to acquire the hardware.
 */
type MediaCaptureResult =
    | {readonly type: 'declined'}
    | {readonly type: 'failed'; readonly error: MediaDeviceError}
    | {readonly type: 'track'; readonly track: MediaStreamTrack};

export interface LocalCaptureSourceInit {
    /**
     * Overrides {@link DEFAULT_ACQUISITION_TIMEOUT_MS}.
     */
    readonly acquisitionTimeoutMs?: u53;
    /**
     * The kind of device this source should capture from.
     */
    readonly kind: CapturableMediaDeviceKind;
    /**
     * Called whenever the state this source reports changed.
     */
    readonly onchange: () => void;
    readonly registry: EnumerableMediaDeviceRegistry;
}

/**
 * Holds one capture device, and keeps it in line with what the consumer asked for.
 *
 * The consumer states what it wants, e.g. whether the hardware should be acquired, whether it
 * should deliver media, and which device to use. This source then reconciles the hardware with
 * that, repeatedly, until the two agree.
 */
export class LocalCaptureSource {
    readonly #_init: LocalCaptureSourceInit;
    readonly #_unsubscribe: () => void;
    /**
     * Stream is stable over the lifetime of the source, only the track is replaced.
     */
    readonly #_stream = new MediaStream();

    #_error: MediaDeviceError | undefined = undefined;
    /**
     * Current target state to reconcile towards.
     */
    #_intent: LocalCaptureIntent = {
        isAcquired: false,
        isEnabled: false,
        device: {type: 'system-default'},
    };
    /**
     * Id of the target device that was requested to capture from. This does not necessarily have to
     * agree with the device we're actually capturing from, because a fallback device might be used
     * if the requested device is not available.
     */
    #_requested: MediaDeviceId | undefined = undefined;
    /**
     * Media track which is currently being captued.
     */
    #_track: MediaStreamTrack | undefined = undefined;

    /**
     * Current count of consecutive automatic stops by the current capture source without any
     * explicit state changes initiated by the consumer in between.
     */
    #_consecutiveFailures: u53 = 0;

    #_isClosed = false;
    /**
     * Resolves once the reconciliation which is underway has settled, so that a consumer can wait
     * for what it asked for to have happened.
     */
    #_settled: Promise<void> = Promise.resolve();
    /**
     * Whether the `#_track` stopped delivering, according to the platform.
     *
     * Note: Recorded separately from the track, because browsers disagree on whether a track whose
     * device was detached reports itself as ended at all, and on when it starts doing so. Every
     * browser reports it once, which is what this remembers.
     */
    #_isEnded = false;
    #_isReconciling = false;

    public constructor(init: LocalCaptureSourceInit) {
        this.#_init = init;

        // Which devices are attached decides which one a selection points at, so a change of them
        // can mean this source is now on the wrong one.
        this.#_unsubscribe = init.registry.subscribe(() => {
            this.#_reconcile();
        });
    }

    /**
     * {@link MediaDeviceId} of the device whose track is currently in use.
     */
    public get active(): MediaDeviceId | undefined {
        const settings = this.#_track?.getSettings();
        if (settings === undefined) {
            return undefined;
        }
        const {deviceId, groupId} = settings;

        // If the device reported by the track is not an alias device, it's id is already the
        // correct one.
        if (isMediaDeviceId(deviceId) && !isAliasMediaDeviceId(deviceId)) {
            return deviceId;
        }

        // Try to match the real device by looking up its. `groupId` in the registry.
        //
        // Note: If the `groupId` is missing or withheld, skip the match, because it would likely
        // resolve to an incorrect device (any other whose `groupId` is also missing).
        if (groupId === undefined || groupId === '') {
            return undefined;
        }
        return this.devices.find((device) => device.groupId === groupId)?.id;
    }

    /**
     * Capture status of the source. Note: A device can be acquired but not enabled.
     */
    public get capture(): LocalCapture {
        const track = this.#_track;
        if (track !== undefined) {
            return {status: 'acquired', stream: this.#_stream, track};
        }
        if (this.#_intent.isAcquired && this.#_isReconciling) {
            return {status: 'acquiring'};
        }
        if (this.#_error !== undefined) {
            return {status: 'failed', error: this.#_error};
        }

        return {status: 'inactive'};
    }

    public get devices(): readonly EnumerableMediaDevice[] {
        switch (this.#_init.kind) {
            case 'camera':
                return this.#_init.registry.devices.cameras;
            case 'display':
                // Display is not enumerable, i.e. there is only ever one device.
                return [];
            case 'microphone':
                return this.#_init.registry.devices.microphones;
            /* istanbul ignore next -- @preserve: Unreachable. */
            default:
                return unreachable(this.#_init.kind);
        }
    }

    /**
     * Whether this source should actually deliver media.
     */
    public get isEnabled(): boolean {
        return this.#_intent.isEnabled;
    }

    /**
     * Whether this source is currently transitioning from one state to another.
     */
    public get isPending(): boolean {
        return this.#_isReconciling;
    }

    /**
     * The current constraints for selecting the specific device of this source.
     */
    public get selected(): EnumerableMediaDeviceSelection {
        return this.#_intent.device;
    }

    /**
     * Sets a new target state for this source. Anything left out stays as it was.
     *
     * @returns Once the hardware has reconciled to the target (or failed) state. Note: Never
     *   raises.
     */
    public async setIntent(intent: Partial<LocalCaptureIntent>): Promise<void> {
        this.#_intent = {...this.#_intent, ...intent};
        this.#_error = undefined;
        // Reset counter of unattended failures, as this is an explicit intent.
        this.#_consecutiveFailures = 0;
        this.#_reconcile();
        const settled = this.#_settled;
        // Note: While `#_reconcile` schedules its own notification after it's done, the intent has
        // changed right away, so we need to send an immediate notification to our listeners.
        this.#_notify();
        await settled;
    }

    /**
     * Chooses which device to use. Takes effect immediately if the hardware is open, or applies as
     * soon as it is opened.
     *
     * @returns Once the device is in use, or selecting it failed.
     */
    public async select(device: EnumerableMediaDeviceSelection): Promise<void> {
        await this.setIntent({device});
    }

    /**
     * Releases the hardware and stops watching for changes. The source reports nothing afterwards.
     */
    public close(): void {
        this.#_isClosed = true;
        this.#_unsubscribe();
        this.#_release();
    }

    #_notify(): void {
        try {
            this.#_init.onchange();
        } catch {
            // The consumer is not supposed to raise in the callback, and it's not our problem.
        }
    }

    /**
     * Which device the selection currently points at.
     */
    #_resolve(): MediaDeviceId | undefined {
        return resolveMediaDevice(this.devices, this.#_intent.device);
    }

    /**
     * Whether the held device is still delivering, and still the one the selection points at.
     */
    #_isCapturingWantedDevice(track: MediaStreamTrack, wanted: MediaDeviceId | undefined): boolean {
        return !this.#_isEnded && track.readyState === 'live' && wanted === this.#_requested;
    }

    /**
     * Brings the hardware in line with what was asked for.
     *
     * Note: A run which is already going picks up whatever is asked for in the meantime, so this
     * returns instead of starting a second reconciliation.
     */
    #_reconcile(): void {
        if (this.#_isReconciling || this.#_isClosed) {
            return;
        }
        this.#_isReconciling = true;
        this.#_settled = this.#_run().catch(
            /* istanbul ignore next -- @preserve: Unreachable, does not raise. */
            () => undefined,
        );
    }

    /**
     * Runs passes until the hardware agrees with what was asked for.
     */
    async #_run(): Promise<void> {
        // This ends because every pass either reaches agreement, or fails.
        while (!this.#_isClosed && !this.#_isSatisfied()) {
            await this.#_apply();
        }
        if (this.#_isClosed) {
            this.#_release();
        }
        // Note: Nothing may be awaited between the last check above and here, so that a change
        // which arrives in the meantime is still seen by this run rather than by nobody.
        this.#_isReconciling = false;
        this.#_notify();
    }

    /**
     * Whether the hardware agrees with what was asked for.
     *
     * IMPORTANT: Must stay in consistent with {@link #_apply}. Everything checked here has to be
     * something a pass establishes, and everything a pass establishes has to be checked here, or
     * the two disagree forever.
     */
    #_isSatisfied(): boolean {
        const intent = this.#_intent;
        const track = this.#_track;
        if (!intent.isAcquired) {
            return track === undefined;
        }
        if (track === undefined) {
            return false;
        }
        return (
            this.#_isCapturingWantedDevice(track, this.#_resolve()) &&
            track.enabled === intent.isEnabled
        );
    }

    /**
     * Does one thing towards agreement, in the order {@link #_isSatisfied} checks for it.
     */
    async #_apply(): Promise<void> {
        const intent = this.#_intent;
        if (!intent.isAcquired) {
            this.#_release();
            return;
        }

        const wanted = this.#_resolve();
        const track = this.#_track;
        if (track === undefined || !this.#_isCapturingWantedDevice(track, wanted)) {
            await this.#_acquire(wanted);
            return;
        }

        track.enabled = intent.isEnabled;
        this.#_notify();
    }

    /**
     * Opens the hardware and puts its track into the stream, replacing the current track.
     */
    async #_acquire(wanted: MediaDeviceId | undefined): Promise<void> {
        if (this.#_consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            // The device has failed too many times, so we give up trying to acquire it.
            this.#_intent = {...this.#_intent, isAcquired: false, isEnabled: false};
            this.#_error = new MediaDeviceInUseError('The device kept stopping by itself');
            this.#_release();
            return;
        }

        // Let go of the outgoing device before asking for the incoming one, as some platforms
        // refuse to open a device while another one of the same kind is still held, and end the new
        // track right away. The outgoing track keeps being reported until the incoming one arrives,
        // so that the capture does not appear to stop in between.
        const outgoing = this.#_track;
        if (outgoing !== undefined) {
            outgoing.removeEventListener('ended', this.#_handleTrackEnded);
            outgoing.stop();
        }

        // Open the wanted device, or fall back to the default device if it fails.
        let result = await this.#_open(wanted);
        if (
            result.type === 'failed' &&
            wanted !== undefined &&
            (result.error instanceof MediaDeviceConstraintsError ||
                result.error instanceof MediaDeviceInUseError)
        ) {
            // The device cannot deliver what was asked for, is not there at all, or something else
            // holds it. Retry without constraints, which lets the system decide which one to use.
            result = await this.#_open(undefined);
        }
        if (result.type !== 'track') {
            // Note: Also resets what was asked for, so that this source does not keep asking the
            // platform for something it just refused.
            this.#_intent = {...this.#_intent, isAcquired: false, isEnabled: false};
            this.#_error = result.type === 'failed' ? result.error : undefined;
            this.#_release();
            return;
        }
        if (this.#_isClosed || !this.#_intent.isAcquired) {
            // The hardware is not wanted any more, e.g. because the capture was turned off again
            // while it was being opened. Let go of it right away instead of holding it until the
            // next pass, so that it is never in use for no reason.
            result.track.stop();
            return;
        }

        // Attach the new track.
        if (outgoing !== undefined) {
            this.#_stream.removeTrack(outgoing);
        }
        this.#_stream.addTrack(result.track);
        result.track.enabled = this.#_intent.isEnabled;
        result.track.addEventListener('ended', this.#_handleTrackEnded, {once: true});
        this.#_track = result.track;
        this.#_requested = wanted;
        this.#_isEnded = false;
        this.#_error = undefined;

        // The platform reveals what it withheld about the devices once one of them was opened, so
        // this is the moment their names become available.
        this.#_init.registry.refresh().catch(
            /* istanbul ignore next -- @preserve: Unreachable, the registry reports instead of
               raising. */
            () => undefined,
        );

        // Notify on successful acquisition.
        this.#_notify();
    }

    /**
     * Tries to open the device and returns the result.
     */
    async #_open(id: MediaDeviceId | undefined): Promise<MediaCaptureResult> {
        // Prepare capture request.
        let request: Promise<MediaStream>;
        switch (this.#_init.kind) {
            case 'camera':
                request = navigator.mediaDevices.getUserMedia({
                    video:
                        id === undefined
                            ? CAMERA_CONSTRAINTS
                            : {...CAMERA_CONSTRAINTS, deviceId: {exact: id}},
                });
                break;
            case 'display':
                // Note: `id` is always `undefined` for this kind, because it's not enumerable. What
                // is captured is picked by the user in the platform's own picker, not as a
                // constraint.
                request = navigator.mediaDevices.getDisplayMedia({video: DISPLAY_CONSTRAINTS});
                break;
            case 'microphone':
                request = navigator.mediaDevices.getUserMedia({
                    audio:
                        id === undefined
                            ? MICROPHONE_CONSTRAINTS
                            : {...MICROPHONE_CONSTRAINTS, deviceId: {exact: id}},
                });
                break;
            /* istanbul ignore next -- @preserve: Unreachable. */
            default:
                return unreachable(this.#_init.kind);
        }

        // Execute capture request.
        let stream: MediaStream;
        try {
            stream = await TIMER.waitFor(
                request,
                this.#_init.acquisitionTimeoutMs ?? DEFAULT_ACQUISITION_TIMEOUT_MS,
            );
        } catch (error) {
            if (error instanceof TimeoutError) {
                // The request is still running, so a device which arrives late has to be let go of
                // as well, or it stays in use with nobody holding it.
                void request.then(
                    (late) => {
                        for (const track of late.getTracks()) {
                            track.stop();
                        }
                    },
                    () => undefined,
                );
                return {
                    type: 'failed',
                    error: new MediaDeviceTimeoutError('The device could not be opened in time', {
                        cause: error,
                    }),
                };
            }

            const failure = toMediaDeviceError(error);
            if (
                this.#_init.kind === 'display' &&
                failure instanceof MediaDevicePermissionDeniedByUserError
            ) {
                // Refusal by the user is not considered a failure.
                return {type: 'declined'};
            }
            // Other errors are considered a failure.
            return {type: 'failed', error: failure};
        }

        // Obtain track.
        const [track] = stream.getTracks();
        if (track === undefined) {
            return {
                type: 'failed',
                error: new MediaDeviceNotFoundError('The platform opened no device'),
            };
        }
        if (track.readyState !== 'live') {
            // The platform answered with a track which is already dead.
            for (const each of stream.getTracks()) {
                each.stop();
            }
            return {
                type: 'failed',
                error: new MediaDeviceInUseError('The device stopped delivering immediately'),
            };
        }
        return {type: 'track', track};
    }

    /**
     * Lets go of the hardware, if any is held.
     */
    #_release(): void {
        const track = this.#_track;
        this.#_track = undefined;
        this.#_requested = undefined;
        this.#_isEnded = false;
        if (track !== undefined) {
            track.removeEventListener('ended', this.#_handleTrackEnded);
            this.#_stream.removeTrack(track);
            track.stop();
        }
        this.#_notify();
    }

    /**
     * The device stopped delivering on its own.
     */
    readonly #_handleTrackEnded = (): void => {
        this.#_isEnded = true;
        this.#_consecutiveFailures += 1;
        if (this.#_init.kind === 'display') {
            // The user ended the screen capture through the platform's own control, which means the
            // same as asking this source to stop.
            this.#_intent = {...this.#_intent, isAcquired: false, isEnabled: false};
        }
        this.#_reconcile();
    };
}
