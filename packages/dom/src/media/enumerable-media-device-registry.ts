import {AsyncLock} from '@threema/ts-utils/lock/async-lock';

import type {EnumerableMediaDevice, EnumerableMediaDeviceKind} from './media-device';
import {
    MediaDeviceEnumerationError,
    type MediaDeviceError,
    toMediaDeviceError,
} from './media-device-error';
import {isAliasMediaDeviceId, isMediaDeviceId} from './media-device-id';

/**
 * Map from browser {@link MediaDeviceKind} naming to our own naming.
 */
const KINDS: Readonly<Record<string, EnumerableMediaDeviceKind | undefined>> = {
    audioinput: 'microphone',
    videoinput: 'camera',
    audiooutput: 'speaker',
};

/**
 * The devices of every kind, in the order the platform reported them in.
 */
interface EnumerableMediaDeviceList {
    readonly microphones: readonly EnumerableMediaDevice[];
    readonly cameras: readonly EnumerableMediaDevice[];
    readonly speakers: readonly EnumerableMediaDevice[];
}

/**
 * Keeps track of the media devices the machine has, and of the changes the platform reports.
 *
 * Note: The platform reports a change of the device list twice in some browsers, so the report is
 * compared against the previous one and subscribers hear about a change only if there was one.
 */
export class EnumerableMediaDeviceRegistry {
    readonly #_lock = new AsyncLock();
    readonly #_listeners = new Set<(devices: EnumerableMediaDeviceList) => void>();

    #_devices: EnumerableMediaDeviceList = {microphones: [], cameras: [], speakers: []};
    #_devicesKey = '';

    public constructor() {
        navigator.mediaDevices.addEventListener('devicechange', this.#_handleDeviceChange);
    }

    /**
     * The devices the platform currently reports. Empty until {@link refresh} or {@link reveal} ran
     * for the first time.
     */
    public get devices(): EnumerableMediaDeviceList {
        return this.#_devices;
    }

    /**
     * Subscribes to changes of the device list.
     *
     * Note: The listener is called when the list changed, not when it was read, so it does not
     * receive the current list. Read {@link devices} for that.
     *
     * @param listener Called with the new list whenever it changed.
     * @returns A function which cancels the subscription.
     */
    public subscribe(listener: (devices: EnumerableMediaDeviceList) => void): () => void {
        this.#_listeners.add(listener);
        return () => {
            this.#_listeners.delete(listener);
        };
    }

    /**
     * Reads the devices the platform reports, and refreshes {@link devices}.
     *
     * @returns The current list of devices, or the failure if the platform failed to report them.
     */
    public async refresh(): Promise<EnumerableMediaDeviceList | MediaDeviceEnumerationError> {
        return await this.#_lock.with(async () => await this.#_refresh());
    }

    /**
     * Makes the platform reveal withheld device info, and refreshes {@link devices}.
     *
     * Note: This may prompt the user for access to their microphone and camera, so it must only be
     * called when the user asked for something which needs device info, e.g. to display a list of
     * device names. No prompt is displayed if permissions have already been granted.
     *
     * @returns The failure if the names could not be revealed, `undefined` otherwise.
     */
    public async reveal(): Promise<MediaDeviceError | undefined> {
        return await this.#_lock.with(async () => {
            // The names may have become available since the last read, e.g. because a capture was
            // started in the meantime, in which case nothing needs to be unlocked.
            const refreshed = await this.#_refresh();
            if (refreshed instanceof Error) {
                return refreshed;
            }
            const devices = [...refreshed.microphones, ...refreshed.cameras, ...refreshed.speakers];
            // The platform either reports no device at all, which is what it does before access was
            // granted, or it withholds the name of one it does report.
            if (devices.length !== 0 && devices.every((device) => device.label !== undefined)) {
                // No device info withheld, so we don't need to reveal anything.
                return undefined;
            }

            // Try to capture and immediately release the devices again, which is the only way to
            // prompt for device permissions and make the platform reveal device information.
            //
            // Note: Both kinds are requested at once, so that the user sees at most one prompt.
            const captureResult: MediaStream | MediaDeviceError = await navigator.mediaDevices
                .getUserMedia({audio: true, video: true})
                // A machine without a camera rejects the request as a whole, so prompt again for
                // the microphone only.
                .catch(async () => await navigator.mediaDevices.getUserMedia({audio: true}))
                .catch((cause: unknown) => toMediaDeviceError(cause));
            if (captureResult instanceof Error) {
                // Return early if the capture resulted in an error.
                return captureResult;
            }
            // End a capture immediately, i.e. release the hardware we opened.
            for (const track of captureResult.getTracks()) {
                track.stop();
            }

            // Now that we have the necessary permissions, trigger a fresh enumeration to obtain the
            // complete info about available media devices.
            const result = await this.#_refresh();
            return result instanceof Error ? result : undefined;
        });
    }

    /**
     * Stops watching the platform for changes and drops every subscriber.
     */
    public close(): void {
        navigator.mediaDevices.removeEventListener('devicechange', this.#_handleDeviceChange);
        this.#_listeners.clear();
    }

    /**
     * Reads the devices again, because the platform reported that they changed.
     */
    readonly #_handleDeviceChange = (): void => {
        this.#_lock
            .with(async () => await this.#_refresh())
            // This should be unreachable, but if it happens, keep the devices we know of and wait
            // for the next change.
            .catch(
                /* istanbul ignore next -- @preserve: Unreachable, see above. */ () => undefined,
            );
    };

    /**
     * Enumerates the devices, updates the internal device list, and notifies the subscribers if the
     * platform reports something else than it did before.
     *
     * IMPORTANT: MUST only be called while {@link #_lock} is held.
     *
     * @returns The current device list for convenience, or an error if device enumeration
     *   failed.
     */
    async #_refresh(): Promise<EnumerableMediaDeviceList | MediaDeviceEnumerationError> {
        const result = await navigator.mediaDevices.enumerateDevices().catch(
            (cause: unknown) =>
                new MediaDeviceEnumerationError('Unable to determine the available devices', {
                    cause,
                }),
        );
        if (result instanceof Error) {
            return result;
        }

        // Stringify, so we can easily compare if there was any change compared to the last
        // enumeration.
        const key = JSON.stringify(
            result.map((device) => [device.kind, device.deviceId, device.groupId, device.label]),
        );
        if (key === this.#_devicesKey) {
            // Device list is still the same.
            return this.#_devices;
        }
        this.#_devicesKey = key;

        // Parse and map device info to our own shape.
        const devices: Record<EnumerableMediaDeviceKind, Map<string, EnumerableMediaDevice>> = {
            microphone: new Map(),
            camera: new Map(),
            speaker: new Map(),
        };
        for (const entry of result) {
            const device = isMediaDeviceId(entry.deviceId)
                ? {
                      id: entry.deviceId,
                      // The platform reports empty strings for withheld info, which we map to
                      // `undefined` in our own shape.
                      groupId: entry.groupId === '' ? undefined : entry.groupId,
                      label: entry.label === '' ? undefined : entry.label,
                  }
                : undefined;
            const kind = KINDS[entry.kind];
            if (
                device === undefined ||
                kind === undefined ||
                // Ignore redundant virtual devices.
                isAliasMediaDeviceId(device.id)
            ) {
                continue;
            }
            // Ignore duplicate device ids. The platform is expected to report each device at most
            // once per kind, but some platforms/hardware combinations violate that.
            devices[kind].set(device.id, device);
        }
        this.#_devices = {
            microphones: [...devices.microphone.values()],
            cameras: [...devices.camera.values()],
            speakers: [...devices.speaker.values()],
        };

        // Notify listeners with the new device list.
        for (const listener of this.#_listeners) {
            try {
                listener(this.#_devices);
            } catch {
                // We don't care if a listener callback fails, because that's their problem :).
            }
        }

        // Return the refreshed device list.
        return this.#_devices;
    }
}
