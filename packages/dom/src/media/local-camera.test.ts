import {waitUntilStable} from '@threema/test-utils';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {type FakeMediaDevices, installFakeMediaDevices} from '../utils/test/fake-media-devices';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalCamera} from './local-camera';
import {
    MediaDeviceInUseError,
    MediaDeviceNotFoundError,
    MediaDevicePermissionDeniedByUserError,
    MediaDeviceTimeoutError,
} from './media-device-error';
import type {MediaDeviceId} from './media-device-id';

/**
 * The platform's own implementation, kept before a fake is installed over it.
 */
const PLATFORM = navigator.mediaDevices;

let camera: LocalCamera | undefined;
let registry: EnumerableMediaDeviceRegistry | undefined;
let fake: FakeMediaDevices | undefined;
let captures = 0;

/**
 * Builds a camera on top of a registry, both of which are torn down after the test.
 */
async function createCamera(): Promise<LocalCamera> {
    registry = new EnumerableMediaDeviceRegistry();
    await registry.refresh();
    camera = new LocalCamera({
        registry,
        onchange: () => undefined,
        acquisitionTimeoutMs: 200,
    });
    return camera;
}

/**
 * Opens a real camera, and counts how often that was asked for.
 */
async function capture(constraints: MediaStreamConstraints): Promise<MediaStream> {
    captures += 1;
    return await PLATFORM.getUserMedia(constraints);
}

/**
 * The cameras the browser was launched with.
 */
async function realCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await PLATFORM.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput');
}

beforeEach(() => {
    captures = 0;
});

afterEach(() => {
    camera?.close();
    camera = undefined;
    registry?.close();
    registry = undefined;
    fake?.restore();
    fake = undefined;
});

describe('LocalCamera', () => {
    it('opens the camera and reports the track it delivers', async () => {
        // Arrange
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const {isEnabled, capture: state, active} = subject.state;
        expect(isEnabled).toBe(true);
        expect(state.status).toBe('acquired');
        expect(state.status === 'acquired' && state.track.readyState).toBe('live');
        expect(state.status === 'acquired' && state.track.enabled).toBe(true);
        expect(active).not.toBe(undefined);
    });

    it('notifies the consumer when it is enabled, before the device is open', async () => {
        // Arrange
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const seen: {readonly isEnabled: boolean; readonly status: string}[] = [];
        const subject = new LocalCamera({
            registry,
            acquisitionTimeoutMs: 200,
            onchange: () => {
                if (camera !== undefined) {
                    seen.push({
                        isEnabled: camera.state.isEnabled,
                        status: camera.state.capture.status,
                    });
                }
            },
        });
        camera = subject;

        // Act
        await subject.enable();

        // Assert: Reported before the hardware caught up, so that a control can follow the
        // interaction immediately.
        expect(seen[0]).toEqual({isEnabled: true, status: 'acquiring'});
        await waitUntilStable(() => !subject.state.isPending);
    });

    it('reports that it is acquiring the camera while opening it is still in progress', async () => {
        // Arrange
        const subject = await createCamera();

        // Act
        const opening = subject.enable();

        // Assert
        expect(subject.state.capture.status).toBe('acquiring');
        expect(subject.state.isPending).toBe(true);
        await opening;
    });

    it('lets go of the camera when it is turned off', async () => {
        // Arrange
        const subject = await createCamera();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const opened = subject.state.capture;

        // Act
        await subject.disable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.isEnabled).toBe(false);
        expect(subject.state.capture.status).toBe('inactive');
        expect(opened.status === 'acquired' && opened.track.readyState).toBe('ended');
    });

    it('opens the camera once when it is turned on and off again in one go', async () => {
        // Arrange
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();

        // The requests themselves are ordered and `isEnabled` updates immediately upon each
        // request, and doesn't race.
        const requests = [subject.enable(), subject.disable(), subject.enable(), subject.disable()];
        await Promise.all(requests);
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Only enabled once, because the second call to `enable` happens while the device
        // is still reconciling.
        expect(captures).toBe(1);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('turns the camera on and off again when it is toggled', async () => {
        // Arrange
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();

        // Act
        subject.toggle();

        // Assert
        expect(subject.state.isEnabled).toBe(true);
        await waitUntilStable(() => !subject.state.isPending);
        expect(subject.state.capture.status).toBe('acquired');

        // Act
        subject.toggle();

        // Assert
        expect(subject.state.isEnabled).toBe(false);
        await waitUntilStable(() => !subject.state.isPending);
        expect(subject.state.capture.status).toBe('inactive');
        expect(captures).toBe(1);
    });

    it('remembers a camera chosen while it is off, and uses it once it is on', async () => {
        // Arrange
        const wanted = unwrap((await realCameras())[1], 'a second camera');
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();

        // Act
        await subject.select({type: 'id', id: wanted.deviceId as MediaDeviceId});
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Choosing a camera does not open one.
        expect(captures).toBe(0);
        expect(subject.state.selected).toEqual({type: 'id', id: wanted.deviceId});

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.active).toBe(wanted.deviceId);
    });

    it('replaces the track inside the same stream when another camera is chosen', async () => {
        // Arrange
        const cameras = await realCameras();
        const first = unwrap(cameras[0], 'a camera');
        const second = unwrap(cameras[1], 'a second camera');
        const subject = await createCamera();
        await subject.select({type: 'id', id: first.deviceId as MediaDeviceId});
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const before = subject.state.capture;

        // Act
        await subject.select({type: 'id', id: second.deviceId as MediaDeviceId});
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const after = subject.state.capture;
        expect(after.status).toBe('acquired');
        expect(before.status === 'acquired' && after.status === 'acquired').toBe(true);
        if (before.status === 'acquired' && after.status === 'acquired') {
            expect(after.stream).toBe(before.stream);
            expect(after.track).not.toBe(before.track);
            expect(after.stream.getVideoTracks()).toEqual([after.track]);
        }
        expect(subject.state.active).toBe(second.deviceId);
    });

    it('lets the system decide again when the system default is chosen after a camera', async () => {
        // Arrange: Capturing on a camera the user picked themselves.
        const second = unwrap((await realCameras())[1], 'This test needs a second camera');
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();
        await subject.select({type: 'id', id: second.deviceId as MediaDeviceId});
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        expect(subject.state.active).toBe(second.deviceId);

        // Act
        await subject.select({type: 'system-default'});
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(captures).toBe(2);
        expect(subject.state.selected).toEqual({type: 'system-default'});
        expect(subject.state.capture.status).toBe('acquired');
        expect(subject.state.active).not.toBe(undefined);
    });

    it('opens another camera when the one in use is detached', async () => {
        // Arrange
        const cameras = await realCameras();
        const first = unwrap(cameras[0], 'a camera');
        const second = unwrap(cameras[1], 'a second camera');
        let attached = cameras;
        fake = installFakeMediaDevices(() => attached, capture);
        const subject = await createCamera();
        await subject.select({type: 'id', id: second.deviceId as MediaDeviceId});
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        expect(subject.state.active).toBe(second.deviceId);

        // Act: The chosen camera goes away.
        attached = [first];
        fake.dispatchDeviceChange();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: It stayed acquired, on whichever camera the system offers, while the original
        // choice is kept.
        expect(subject.state.capture.status).toBe('acquired');
        expect(subject.state.selected).toEqual({type: 'id', id: second.deviceId});

        // Act: The chosen camera comes back.
        attached = cameras;
        fake.dispatchDeviceChange();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.active).toBe(second.deviceId);
    });

    it('opens another camera when the track ends on its own', async () => {
        // Arrange
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const opened = subject.state.capture;

        // Act: The platform reports that the device stopped delivering.
        expect(opened.status).toBe('acquired');
        if (opened.status === 'acquired') {
            opened.track.dispatchEvent(new Event('ended'));
        }
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(captures).toBe(2);
        expect(subject.state.capture.status).toBe('acquired');
    });

    it('gives up on a camera which keeps stopping, and tries again when it is asked to', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                const stream = await capture(constraints);
                // Alive when handed over, dead a moment later, to simulate failing hardware.
                setTimeout(() => {
                    for (const track of stream.getTracks()) {
                        track.stop();
                        track.dispatchEvent(new Event('ended'));
                    }
                }, 20);
                return stream;
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => subject.state.capture.status === 'failed');

        // Assert: Opened again a few times, because a device which drops out once usually comes
        // back. Give up after a number of retries, instead of retrying forever. Should be reported
        // as off after giving up.
        const failed = subject.state.capture;
        expect(failed.status).toBe('failed');
        expect(failed.status === 'failed' && failed.error).toBeInstanceOf(MediaDeviceInUseError);
        expect(subject.state.isEnabled).toBe(false);
        expect(captures).toBe(3);

        // Act: The user turns it on again.
        await subject.enable();
        await waitUntilStable(() => subject.state.capture.status === 'failed');

        // Assert
        expect(captures).toBe(6);
        expect(subject.state.capture.status).toBe('failed');
    });

    it('does not give up on a failing device if the threshold is not reached', async () => {
        // Arrange: Two failures, then a request, then two more. The manual request starts the count
        // over, so the failures never reach the threshold for giving up.
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();
        await subject.enable();

        // Act
        for (const round of [0, 1, 2, 3]) {
            if (round === 2) {
                await subject.enable();
            }
            const opened = subject.state.capture;
            expect(opened.status).toBe('acquired');
            if (opened.status === 'acquired') {
                opened.track.dispatchEvent(new Event('ended'));
            }
            await waitUntilStable(() => !subject.state.isPending);
        }

        // Assert
        expect(subject.state.capture.status).toBe('acquired');
    });

    it('reports a refused camera, and asks for it only once', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            () => {
                captures += 1;
                throw new DOMException('Permission denied', 'NotAllowedError');
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: The failure is reported, and the camera reports as disabled as a result.
        const state = subject.state;
        expect(state.capture.status).toBe('failed');
        expect(state.capture.status === 'failed' && state.capture.error).toBeInstanceOf(
            MediaDevicePermissionDeniedByUserError,
        );
        expect(state.isEnabled).toBe(false);
        expect(captures).toBe(1);
    });

    it('forgets the failure when the camera is asked for again', async () => {
        // Arrange
        let isRefused = true;
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                if (isRefused) {
                    throw new DOMException('Permission denied', 'NotAllowedError');
                }
                return await capture(constraints);
            },
        );
        const subject = await createCamera();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        expect(subject.state.capture.status).toBe('failed');

        // Act
        isRefused = false;
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.capture.status).toBe('acquired');
    });

    it('opens another camera when the chosen one cannot deliver', async () => {
        // Arrange
        const wanted = unwrap((await realCameras())[0], 'a camera');
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                const video = constraints.video;
                if (typeof video === 'object' && video.deviceId !== undefined) {
                    captures += 1;
                    throw new DOMException('Cannot satisfy', 'OverconstrainedError');
                }
                return await capture(constraints);
            },
        );
        const subject = await createCamera();

        // Act
        await subject.select({type: 'id', id: wanted.deviceId as MediaDeviceId});
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Asked for twice, and capturing on whatever the system offered instead.
        expect(captures).toBe(2);
        expect(subject.state.capture.status).toBe('acquired');
    });

    it('opens another camera when the chosen one is held by something else', async () => {
        // Arrange
        const cameras = await realCameras();
        const wanted = unwrap(cameras[1]);
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                const video = constraints.video;
                if (typeof video === 'object' && video.deviceId !== undefined) {
                    throw new DOMException('Could not start video source', 'NotReadableError');
                }
                return await capture(constraints);
            },
        );
        const subject = await createCamera();

        // Act
        await subject.select({type: 'id', id: wanted.deviceId as MediaDeviceId});
        await subject.enable();

        // Assert: Capturing from a camera, but a different one. The requested original choice is
        // kept.
        expect(subject.state.capture.status).toBe('acquired');
        expect(subject.state.selected).toEqual({type: 'id', id: wanted.deviceId});
        expect(subject.state.active).not.toBe(wanted.deviceId);
        expect(captures).toBe(1);
    });

    it('reports a camera which cannot deliver when none was named', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            () => {
                captures += 1;
                throw new DOMException('Cannot satisfy', 'OverconstrainedError');
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Nothing was named, so there is nothing to drop and ask again without.
        expect(captures).toBe(1);
        expect(subject.state.capture.status).toBe('failed');
    });

    it('reports a platform which hands over a stream without a track', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            () => new MediaStream(),
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(state.status).toBe('failed');
        expect(state.status === 'failed' && state.error).toBeInstanceOf(MediaDeviceNotFoundError);
    });

    it('gives up on a camera which hands over a track that is already dead', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                const stream = await capture(constraints);
                // The device answered, but what it handed over is dead on arrival, e.g. because it
                // was detached while it was being opened.
                for (const track of stream.getTracks()) {
                    track.stop();
                }
                return stream;
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Reported as a failure. Asking again would only ever hand over another dead track.
        const state = subject.state.capture;
        expect(state.status).toBe('failed');
        expect(state.status === 'failed' && state.error).toBeInstanceOf(MediaDeviceInUseError);
        expect(captures).toBe(1);
    });

    it('gives up on a camera which is never handed over, and lets go of it if it rearrives', async () => {
        // Arrange
        let late: MediaStream | undefined;
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 400);
                });
                late = await PLATFORM.getUserMedia(constraints);
                return late;
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(state.status).toBe('failed');
        expect(state.status === 'failed' && state.error).toBeInstanceOf(MediaDeviceTimeoutError);

        // Assert: The device which arrived after we stopped waiting is not left in use.
        await new Promise((resolve) => {
            setTimeout(resolve, 400);
        });
        expect(late).not.toBe(undefined);
        expect(late?.getTracks().map((track) => track.readyState)).toEqual(['ended']);
    });

    it('gives up on a camera which is refused after we stopped waiting', async () => {
        // Arrange
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async () => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 400);
                });
                throw new DOMException('Permission denied', 'NotAllowedError');
            },
        );
        const subject = await createCamera();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.capture.status).toBe('failed');
        await new Promise((resolve) => {
            setTimeout(resolve, 400);
        });
        expect(subject.state.capture.status).toBe('failed');
    });

    it('lets go of a camera which arrives after it was closed', async () => {
        // Arrange
        let opened: MediaStream | undefined;
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                await new Promise((resolve) => {
                    setTimeout(resolve, 50);
                });
                opened = await PLATFORM.getUserMedia(constraints);
                return opened;
            },
        );
        const subject = await createCamera();

        // Act
        const opening = subject.enable();
        subject.close();
        await opening;
        await TIMER.sleep(200);

        // Assert
        expect(opened).not.toBe(undefined);
        expect(opened?.getTracks().map((track) => track.readyState)).toEqual(['ended']);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('does nothing once it was closed', async () => {
        // Arrange
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createCamera();
        subject.close();

        // Act
        await subject.enable();
        await new Promise((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert
        expect(captures).toBe(0);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('promise settles once the camera is open, and once it is let go of again', async () => {
        // Arrange
        const subject = await createCamera();

        // Act
        await subject.enable();

        // Assert
        expect(subject.state.capture.status).toBe('acquired');
        expect(subject.state.isPending).toBe(false);

        // Act
        await subject.disable();

        // Assert
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('promise settles once the chosen camera is the one in use', async () => {
        // Arrange
        const cameras = await realCameras();
        const second = unwrap(cameras[1]);
        const subject = await createCamera();
        await subject.enable();

        // Act
        await subject.select({type: 'id', id: second.deviceId as MediaDeviceId});

        // Assert
        expect(subject.state.active).toBe(second.deviceId);
    });

    it('reports the cameras of the machine', async () => {
        // Arrange
        const subject = await createCamera();

        // Assert
        expect(subject.state.devices.length).toBeGreaterThan(0);
        expect(subject.state.selected).toEqual({type: 'system-default'});
    });
});
