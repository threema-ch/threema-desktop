import type {u53} from '@threema/ts-utils/integer/u53';

import type {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalCaptureSource} from './local-capture-source';
import type {LocalCaptureState} from './local-devices-state';

export interface LocalDisplayInit {
    readonly acquisitionTimeoutMs?: u53;
    readonly onchange: () => void;
    readonly registry: EnumerableMediaDeviceRegistry;
}

/**
 * Manages local screen capturing (a screen, a window or a tab of the machine).
 *
 * Note: Unlike the microphone and the camera, there is nothing to select here. What is shared is
 * picked by the user in the platform's own picker, every time the capture is turned on, and the
 * platform offers its own way to end it again, which this follows.
 */
export class LocalDisplay {
    readonly #_source: LocalCaptureSource;

    public constructor(init: LocalDisplayInit) {
        this.#_source = new LocalCaptureSource({
            acquisitionTimeoutMs: init.acquisitionTimeoutMs,
            kind: 'display',
            onchange: init.onchange,
            registry: init.registry,
        });
    }

    public get state(): LocalCaptureState {
        return {
            capture: this.#_source.capture,
            isEnabled: this.#_source.isEnabled,
            isPending: this.#_source.isPending,
        };
    }

    /**
     * Asks the user what to share, and starts sharing it.
     */
    public enable(): void {
        this.#_source.setIntent({isAcquired: true, isEnabled: true});
    }

    /**
     * Stops sharing.
     */
    public disable(): void {
        this.#_source.setIntent({isAcquired: false, isEnabled: false});
    }

    /**
     * Releases the hardware and stops watching for changes. The source reports nothing afterwards.
     */
    public close(): void {
        this.#_source.close();
    }
}
