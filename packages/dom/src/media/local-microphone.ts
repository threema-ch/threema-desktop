import type {u53} from '@threema/ts-utils/integer/u53';

import type {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalCaptureSource} from './local-capture-source';
import type {LocalSelectableCaptureState} from './local-devices-state';
import type {EnumerableMediaDeviceSelection} from './media-device';

export interface LocalMicrophoneInit {
    readonly acquisitionTimeoutMs?: u53;
    readonly onchange: () => void;
    readonly registry: EnumerableMediaDeviceRegistry;
}

/**
 * Manages local microphone devices.
 *
 * Note: Unlike the camera, this holds on to its device once it was opened, and only silences its
 * track while it is off to improve unmute latency. The device is only let go of when the manager is
 * closed.
 */
export class LocalMicrophone {
    readonly #_source: LocalCaptureSource;

    public constructor(init: LocalMicrophoneInit) {
        this.#_source = new LocalCaptureSource({
            acquisitionTimeoutMs: init.acquisitionTimeoutMs,
            kind: 'microphone',
            onchange: init.onchange,
            registry: init.registry,
        });
    }

    public get state(): LocalSelectableCaptureState {
        return {
            capture: this.#_source.capture,
            devices: this.#_source.devices,
            effective: this.#_source.effective,
            isEnabled: this.#_source.isEnabled,
            isPending: this.#_source.isPending,
            selected: this.#_source.selected,
            selection: this.#_source.selection,
        };
    }

    /**
     * Opens the device without unmuting it, so that a later {@link enable} is instant.
     *
     * Note: Optional. {@link enable} opens the device by itself if this was not called before, so
     * this is only useful to a consumer which knows it will want the microphone shortly.
     */
    public async acquire(): Promise<void> {
        await this.#_source.setIntent({isAcquired: true});
    }

    /**
     * Unmutes, opening the device first if it is not open yet.
     */
    public async enable(): Promise<void> {
        await this.#_source.setIntent({isAcquired: true, isEnabled: true});
    }

    /**
     * Mutes. Note: The device stays acquired.
     */
    public async disable(): Promise<void> {
        await this.#_source.setIntent({isEnabled: false});
    }

    /**
     * Unmutes if it is muted, and mutes if it is unmuted, opening the device first if needed.
     */
    public toggle(): void {
        // Even though `enable` and `disable` are async, `isEnabled` is updated immediately, so
        // simply toggling the state does not race. `LocalCaptureSource` will reconcile until the
        // latest desired target state is reached.
        const requested = this.#_source.isEnabled ? this.disable() : this.enable();
        requested.catch(
            /* istanbul ignore next -- @preserve: Unreachable, a failure is reported in the state. */
            () => undefined,
        );
    }

    /**
     * Chooses which microphone to use.
     */
    public async select(device: EnumerableMediaDeviceSelection): Promise<void> {
        await this.#_source.select(device);
    }

    /**
     * Releases the hardware and stops watching for changes. The source reports nothing afterwards.
     */
    public close(): void {
        this.#_source.close();
    }
}
