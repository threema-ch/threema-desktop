import type {u53} from '@threema/ts-utils/integer/u53';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalCamera} from './local-camera';
import type {LocalDevicesState} from './local-devices-state';
import {LocalDisplay} from './local-display';
import {LocalMicrophone} from './local-microphone';
import {LocalSpeaker} from './local-speaker';
import type {MediaDeviceError} from './media-device-error';

export interface LocalDevicesInit {
    /**
     * Overrides how long the platform is given to hand over a device. Intended for tests.
     */
    readonly acquisitionTimeoutMs?: u53;
    /**
     * Overrides how long the platform is given to let playback start. Intended for tests.
     */
    readonly playbackTimeoutMs?: u53;
}

/**
 * Manages the local media devices of this machine (microphones, cameras, screen capture, and
 * speakers), and exposes them over a convenient API. Also handles errors and fallback logic, device
 * switching, as well as disappearing and reappearing devices.
 *
 * Note: Nothing in here raises. Failures are reported in the state, so a consumer decides whether
 * to display that, report it or ignore it.
 *
 * @example
 * ```ts
 * const localDevices = new LocalDevices();
 * // The current state of all devices (which contains the stable tracks etc.) can be subscribed to.
 * const unsubscribe = localDevices.subscribe((state) => render(state));
 *
 * // The microphone keeps its device held once it was acquired, so unmuting is instant. `acquire`
 * // opens it explicitly, if it hasn't been acquired before, which can be useful to prepare it for
 * // the first unmute.
 * localDevices.microphone.acquire();
 * localDevices.microphone.enable(); // Unmutes, and acquires it first if needed.
 * localDevices.microphone.disable(); // Mutes, but keeps the device acquired.
 *
 * // The camera lets go of its device whenever it is turned off, so that the system doesn't report
 * // it as in use. A device chosen while it is off is used the next time it is enabled.
 * localDevices.camera.select({type: 'label', label: 'FaceTime HD Camera'});
 * localDevices.camera.enable();
 *
 * // Screen capture has nothing to choose. What is shared is picked by the user in the platform's
 * // own picker, every time it is enabled.
 * localDevices.display.enable();
 * localDevices.display.disable();
 *
 * // The speakers expose a sink, which multiple tracks can be connected to.
 * localDevices.speaker.select({type: 'id', id: speakerId});
 * localDevices.state.speaker.sink.connect(remoteTrack);
 * localDevices.state.speaker.sink.disconnect(remoteTrack);
 *
 * // The platform withholds playback until the user interacted with the page, so it has to be
 * // enabled from an user action handler.
 * if (localDevices.state.speaker.playback === 'blocked') {
 *     button.addEventListener('click', () => localDevices.speaker.resume());
 * }
 *
 * // Clean up the local device manager.
 * unsubscribe();
 * localDevices.close();
 * ```
 */
export class LocalDevices {
    public readonly camera: LocalCamera;
    public readonly display: LocalDisplay;
    public readonly microphone: LocalMicrophone;
    public readonly speaker: LocalSpeaker;

    readonly #_listeners = new Set<(state: LocalDevicesState) => void>();
    readonly #_registry = new EnumerableMediaDeviceRegistry();

    public constructor(init?: LocalDevicesInit) {
        const shared = {
            acquisitionTimeoutMs: init?.acquisitionTimeoutMs,
            onchange: () => {
                this.#_emit();
            },
            registry: this.#_registry,
        };
        this.camera = new LocalCamera(shared);
        this.display = new LocalDisplay(shared);
        this.microphone = new LocalMicrophone(shared);
        this.speaker = new LocalSpeaker({
            onchange: shared.onchange,
            playbackTimeoutMs: init?.playbackTimeoutMs,
            registry: this.#_registry,
        });

        // Read the devices once, so that a selection can be resolved and a menu can be offered
        // before anything was captured. Note: This does not prompt, so the platform withholds the
        // names of the devices until a capture ran or the names were asked for, see
        // `registry.reveal()`.
        this.#_registry.refresh().catch(
            /* istanbul ignore next -- @preserve: Unreachable, the registry does not raise. */
            () => undefined,
        );
    }

    /**
     * The current state of the local devices.
     */
    public get state(): LocalDevicesState {
        return {
            camera: this.camera.state,
            display: this.display.state,
            microphone: this.microphone.state,
            speaker: this.speaker.state,
        };
    }

    /**
     * Subscribes to changes of {@link state}.
     *
     * Note: The listener is called when something changed, not when it is subscribed, so it does
     * not receive the initial state. Read {@link state} for that.
     *
     * @param listener Called with the new state whenever it changed.
     * @returns A function which cancels the subscription.
     */
    public subscribe(listener: (state: LocalDevicesState) => void): () => void {
        this.#_listeners.add(listener);
        return () => {
            this.#_listeners.delete(listener);
        };
    }

    /**
     * Makes the platform reveal the names of the devices it withholds.
     *
     * Note: This may prompt the user for access to their microphone and camera, so it must only be
     * called when the user asked for something which needs the names, e.g. to display a list of
     * devices before anything was captured. Capturing reveals them as well, so a consumer which
     * turned a source on does not need this, in which case this is a no-op.
     *
     * @returns The failure if the names could not be revealed, `undefined` otherwise.
     */
    public async reveal(): Promise<MediaDeviceError | undefined> {
        return await this.#_registry.reveal();
    }

    /**
     * Lets go of every device, stops watching for changes and drops every subscriber.
     */
    public close(): void {
        this.camera.close();
        this.display.close();
        this.microphone.close();
        this.speaker.close();
        this.#_registry.close();
        this.#_listeners.clear();
    }

    #_emit(): void {
        const state = this.state;
        for (const listener of this.#_listeners) {
            try {
                listener(state);
            } catch {
                // We don't care if a listener callback fails, because that's their problem :).
            }
        }
    }
}
