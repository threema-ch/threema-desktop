import {waitUntilStable} from '@threema/test-utils';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
    createFakeMediaDeviceInfo,
    type FakeMediaDevices,
    installFakeMediaDevices,
} from '../utils/test/fake-media-devices';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalMicrophone} from './local-microphone';
import type {MediaDeviceId} from './media-device-id';

/**
 * The platform's own implementation, kept before a fake is installed over it.
 */
const PLATFORM = navigator.mediaDevices;

let microphone: LocalMicrophone | undefined;
let registry: EnumerableMediaDeviceRegistry | undefined;
let fake: FakeMediaDevices | undefined;
let captures = 0;

async function createMicrophone(): Promise<LocalMicrophone> {
    registry = new EnumerableMediaDeviceRegistry();
    await registry.refresh();
    microphone = new LocalMicrophone({
        registry,
        onchange: () => undefined,
        acquisitionTimeoutMs: 200,
    });
    return microphone;
}

async function capture(constraints: MediaStreamConstraints): Promise<MediaStream> {
    captures += 1;
    return await PLATFORM.getUserMedia(constraints);
}

async function realMicrophones(): Promise<MediaDeviceInfo[]> {
    const devices = await PLATFORM.enumerateDevices();
    return devices.filter((device) => device.kind === 'audioinput');
}

beforeEach(() => {
    captures = 0;
});

afterEach(() => {
    microphone?.close();
    microphone = undefined;
    registry?.close();
    registry = undefined;
    fake?.restore();
    fake = undefined;
});

describe('LocalMicrophone', () => {
    it('opens the device without unmuting when it is asked for in advance', async () => {
        // Arrange
        const subject = await createMicrophone();

        // Act
        await subject.acquire();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: The device is open and delivering, and what it delivers is silenced.
        const {isEnabled, capture: state} = subject.state;
        expect(isEnabled).toBe(false);
        expect(state.status).toBe('acquired');
        expect(state.status === 'acquired' && state.track.enabled).toBe(false);
    });

    it('opens the device by itself when it is unmuted without being asked for first', async () => {
        // Arrange
        const subject = await createMicrophone();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(subject.state.isEnabled).toBe(true);
        expect(state.status === 'acquired' && state.track.enabled).toBe(true);
    });

    it('keeps the very same track while it is muted', async () => {
        // Arrange
        fake = installFakeMediaDevices(async () => await PLATFORM.enumerateDevices(), capture);
        const subject = await createMicrophone();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const opened = subject.state.capture;
        expect(opened.status).toBe('acquired');

        // Act
        await subject.disable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Still open, still the same track, only silenced.
        const muted = subject.state.capture;
        expect(subject.state.isEnabled).toBe(false);
        expect(muted.status).toBe('acquired');
        if (muted.status === 'acquired' && opened.status === 'acquired') {
            expect(muted.track).toBe(opened.track);
            expect(muted.track.readyState).toBe('live');
            expect(muted.track.enabled).toBe(false);
        }

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Unmuting did not ask the platform for anything.
        const unmuted = subject.state.capture;
        expect(captures).toBe(1);
        expect(unmuted.status === 'acquired' && unmuted.track).toBe(
            opened.status === 'acquired' ? opened.track : undefined,
        );
        expect(unmuted.status === 'acquired' && unmuted.track.enabled).toBe(true);
    });

    it('mutes and unmutes when it is toggled, without letting go of the device', async () => {
        // Arrange
        const subject = await createMicrophone();

        // Act
        subject.toggle();
        await waitUntilStable(() => !subject.state.isPending);
        const opened = subject.state.capture;

        // Assert
        expect(subject.state.isEnabled).toBe(true);
        expect(opened.status === 'acquired' && opened.track.enabled).toBe(true);

        // Act
        subject.toggle();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Muted, but still the same underlying device and track.
        expect(subject.state.isEnabled).toBe(false);
        const muted = subject.state.capture;
        expect(muted.status).toBe('acquired');
        expect(opened.status === 'acquired' && muted.status === 'acquired' && muted.track).toBe(
            opened.status === 'acquired' ? opened.track : undefined,
        );
        expect(muted.status === 'acquired' && muted.track.enabled).toBe(false);
    });

    it('stays muted when another microphone is chosen while it is muted', async () => {
        // Arrange
        const wanted = unwrap(
            (await realMicrophones()).find((device) => device.deviceId !== 'default'),
            'a microphone which is not the system default entry',
        );
        const subject = await createMicrophone();
        await subject.acquire();
        await waitUntilStable(() => !subject.state.isPending);

        // Act
        await subject.select({type: 'id', id: wanted.deviceId as MediaDeviceId});
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(subject.state.active).toBe(wanted.deviceId);
        expect(state.status === 'acquired' && state.track.enabled).toBe(false);
    });

    it('keeps the device once it was opened, and only lets go of it when closed', async () => {
        // Arrange
        const subject = await createMicrophone();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        await subject.disable();
        await waitUntilStable(() => !subject.state.isPending);
        const held = subject.state.capture;
        expect(held.status).toBe('acquired');

        // Act
        subject.close();

        // Assert
        expect(subject.state.capture.status).toBe('inactive');
        expect(held.status === 'acquired' && held.track.readyState).toBe('ended');
    });

    it('names no device at all when the system should decide', async () => {
        // Arrange
        let asked: MediaTrackConstraints | undefined;
        fake = installFakeMediaDevices(
            async () => await PLATFORM.enumerateDevices(),
            async (constraints) => {
                asked = typeof constraints.audio === 'object' ? constraints.audio : undefined;
                return await capture(constraints);
            },
        );
        const subject = await createMicrophone();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: The platform's own entry for "whichever device the system prefers" is not named.
        // Asking for nothing is what every browser understands.
        expect(asked?.deviceId).toBe(undefined);
        expect(subject.state.capture.status).toBe('acquired');
    });

    // This should not happen in a real scenario, but Chromium's default dummy device does not have
    // a real device counterpart it shares its `groupId` with.
    it('reports no device in use if the system default device is only virtual', async () => {
        // Arrange
        const subject = await createMicrophone();

        // Act
        await subject.enable();

        // Assert: The platform uses a separate virtual device to denote the system default, which
        // is deliberately excluded from our registry, so the active device is reported as
        // `undefined`.
        expect(subject.state.capture.status).toBe('acquired');
        expect(subject.state.active).toBe(undefined);
        expect(subject.state.devices.map((device) => device.id)).not.toContain('default');
    });

    // This test is the counterpart to the test above, and simulates how Chromium would behave in a
    // real scenario. The system default device is an alias device for another, real device, and
    // both share the same `groupId`.
    it("resolves the track's device to the device behind the alias when the platform has a default alias device", async () => {
        fake = installFakeMediaDevices(
            () => [
                createFakeMediaDeviceInfo({
                    deviceId: 'default',
                    groupId: 'group-1',
                    kind: 'audioinput',
                    label: 'Default - Mic 1',
                }),
                createFakeMediaDeviceInfo({
                    deviceId: 'mic-1',
                    groupId: 'group-1',
                    kind: 'audioinput',
                    label: 'Mic 1',
                }),
            ],
            async (constraints) => {
                const stream = await capture(constraints);
                const [track] = stream.getAudioTracks();
                if (track !== undefined) {
                    Object.defineProperty(track, 'getSettings', {
                        value: () => ({deviceId: 'default', groupId: 'group-1'}),
                    });
                }
                return stream;
            },
        );
        const subject = await createMicrophone();

        // Act
        await subject.enable();

        // Assert: Alias devices are excluded from the registry, so the system default resolves to
        // its real device.
        expect(subject.state.active).toBe('mic-1');
        expect(subject.state.devices.map((device) => device.id)).toEqual(['mic-1']);
    });

    it("resolves the track's device via group id if the platform has no default alias device", async () => {
        // Arrange
        fake = installFakeMediaDevices(
            () => [
                createFakeMediaDeviceInfo({
                    deviceId: 'mic-1',
                    groupId: 'group-1',
                    kind: 'audioinput',
                    label: 'Mic 1',
                }),
            ],
            async (constraints) => {
                const stream = await capture(constraints);
                const [track] = stream.getAudioTracks();
                if (track !== undefined) {
                    // Some platforms name the group of the device they opened, but not the device.
                    Object.defineProperty(track, 'getSettings', {
                        value: () => ({groupId: 'group-1'}),
                    });
                }
                return stream;
            },
        );
        const subject = await createMicrophone();

        // Act
        await subject.enable();

        // Assert
        expect(subject.state.active).toBe('mic-1');
    });

    it("resolves the track's device to none if the platform has a default alias device whose group id is withheld", async () => {
        // Arrange
        fake = installFakeMediaDevices(
            () => [
                createFakeMediaDeviceInfo({
                    deviceId: 'mic-1',
                    groupId: 'group-1',
                    kind: 'audioinput',
                    label: 'Mic 1',
                }),
            ],
            async (constraints) => {
                const stream = await capture(constraints);
                const [track] = stream.getAudioTracks();
                if (track !== undefined) {
                    Object.defineProperty(track, 'getSettings', {
                        value: () => ({deviceId: 'default'}),
                    });
                }
                return stream;
            },
        );
        const subject = await createMicrophone();

        // Act
        await subject.enable();

        // Assert: There is nothing to look the alias up by, so no device is reported as `active`.
        expect(subject.state.active).toBe(undefined);
    });

    it("does not offer the platform's own alias as a device to choose", async () => {
        // Arrange
        const subject = await createMicrophone();

        // Assert: It aliases a device which is offered anyway, so offering it too would list the
        // same hardware twice, under a name the platform writes rather than the user's.
        expect(subject.state.devices.map((device) => device.id)).not.toContain('default');
        expect(subject.state.devices.length).toBeGreaterThan(0);
    });

    it('reports the microphones of the machine', async () => {
        // Arrange
        const subject = await createMicrophone();

        // Assert
        expect(subject.state.devices.length).toBeGreaterThan(0);
        expect(subject.state.selected).toEqual({type: 'system-default'});
    });
});
