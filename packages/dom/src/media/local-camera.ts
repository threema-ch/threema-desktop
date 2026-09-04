import type {u53} from '@threema/ts-utils/integer/u53';

import type {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalCaptureSource} from './local-capture-source';
import type {LocalSelectableCaptureState} from './local-devices-state';
import type {EnumerableMediaDeviceSelection} from './media-device';

export interface LocalCameraInit {
    readonly acquisitionTimeoutMs?: u53;
    readonly onchange: () => void;
    readonly registry: EnumerableMediaDeviceRegistry;
}

/**
 * Manages local camera devices.
 */
export class LocalCamera {
    readonly #_source: LocalCaptureSource;

    public constructor(init: LocalCameraInit) {
        this.#_source = new LocalCaptureSource({
            acquisitionTimeoutMs: init.acquisitionTimeoutMs,
            kind: 'camera',
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
     * Acquires the underlying device and starts capturing.
     */
    public async enable(): Promise<void> {
        await this.#_source.setIntent({isAcquired: true, isEnabled: true});
    }

    /**
     * Stops capturing and releases the underlying device.
     */
    public async disable(): Promise<void> {
        await this.#_source.setIntent({isAcquired: false, isEnabled: false});
    }

    /**
     * Turns the camera on if it is off, and off if it is on.
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
     * Chooses which underlying camera device to use. Note: A camera chosen while the camera is off
     * is remembered, and used the next time it is turned on.
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
