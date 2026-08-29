/**
 * Handle of a fake `navigator.mediaDevices`, as installed by {@link installFakeMediaDevices}.
 */
export interface FakeMediaDevices {
    /**
     * Fires a `devicechange` event, as the platform does when the available devices changed.
     */
    readonly dispatchDeviceChange: () => void;
    /**
     * Restores the platform's own `navigator.mediaDevices`.
     */
    readonly restore: () => void;
}

/**
 * Creates a `MediaDeviceInfo` as the platform would report it.
 *
 * Note: `kind` is a plain `string`, so that a kind which the platform does not define today can be
 * reported as well. The defaults describe a device whose information is withheld.
 *
 * @param info.deviceId Identifier of the device. Defaults to empty, i.e. withheld.
 * @param info.groupId Identifier of the physical device. Defaults to empty, i.e. withheld.
 * @param info.kind Kind of device, as the platform would name it.
 * @param info.label Name of the device. Defaults to empty, i.e. withheld.
 * @returns The device information.
 */
export function createFakeMediaDeviceInfo(info: {
    readonly deviceId?: string;
    readonly groupId?: string;
    readonly kind: string;
    readonly label?: string;
}): MediaDeviceInfo {
    const {deviceId = '', groupId = '', kind, label = ''} = info;

    // Note: Cast because a `MediaDeviceInfo` cannot be constructed, and because `kind` is
    // deliberately wider here than the platform's own union.
    return {deviceId, groupId, kind, label} as unknown as MediaDeviceInfo;
}

/**
 * Replaces `navigator.mediaDevices` with a fake, for tests which need to control what the platform
 * reports, or when it reports it.
 *
 * @param enumerateDevices Called for every enumeration. Read the devices from a mutable variable to
 *   change what the platform reports during a test, return a pending promise to control when an
 *   enumeration resolves, or return a rejected one to make it fail.
 * @param capture Called for every acquisition, i.e. in place of `getUserMedia` and
 *   `getDisplayMedia`. May hand over a stream directly, or a promise of one, to control when an
 *   acquisition resolves. Note: Needed for the failures the browser's fake devices cannot produce,
 *   because they grant the permission automatically and can be opened more than once, i.e.
 *   `NotAllowedError` and `NotReadableError`. Defaults to the platform's own implementation.
 * @returns The handle of the fake. Note: {@link FakeMediaDevices.restore} must be called at the end
 *   of the test, because the fake is installed on the shared `navigator`.
 */
export function installFakeMediaDevices(
    enumerateDevices: () => MediaDeviceInfo[] | Promise<MediaDeviceInfo[]>,
    capture?: (constraints: MediaStreamConstraints) => MediaStream | Promise<MediaStream>,
): FakeMediaDevices {
    const target = new EventTarget();
    const platform = navigator.mediaDevices;
    const fake = {
        addEventListener: target.addEventListener.bind(target),
        dispatchEvent: target.dispatchEvent.bind(target),
        enumerateDevices: async () => await enumerateDevices(),
        getDisplayMedia: async (constraints: MediaStreamConstraints) =>
            capture === undefined
                ? await platform.getDisplayMedia(constraints)
                : await capture(constraints),
        getUserMedia: async (constraints: MediaStreamConstraints) =>
            capture === undefined
                ? await platform.getUserMedia(constraints)
                : await capture(constraints),
        removeEventListener: target.removeEventListener.bind(target),
    };

    Object.defineProperty(navigator, 'mediaDevices', {configurable: true, get: () => fake});

    return {
        dispatchDeviceChange: () => {
            target.dispatchEvent(new Event('devicechange'));
        },
        restore: () => {
            Reflect.deleteProperty(navigator, 'mediaDevices');
        },
    };
}
