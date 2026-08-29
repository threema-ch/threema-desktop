import {waitUntilStable} from '@threema/test-utils';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {type FakeMediaDevices, installFakeMediaDevices} from '../utils/test/fake-media-devices';

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
        subject.acquire();
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
        subject.enable();
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
        subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const opened = subject.state.capture;
        expect(opened.status).toBe('acquired');

        // Act
        subject.disable();
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
        subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Unmuting did not ask the platform for anything.
        const unmuted = subject.state.capture;
        expect(captures).toBe(1);
        expect(unmuted.status === 'acquired' && unmuted.track).toBe(
            opened.status === 'acquired' ? opened.track : undefined,
        );
        expect(unmuted.status === 'acquired' && unmuted.track.enabled).toBe(true);
    });

    it('stays muted when another microphone is chosen while it is muted', async () => {
        // Arrange
        const wanted = unwrap(
            (await realMicrophones()).find((device) => device.deviceId !== 'default'),
            'a microphone which is not the system default entry',
        );
        const subject = await createMicrophone();
        subject.acquire();
        await waitUntilStable(() => !subject.state.isPending);

        // Act
        subject.select({type: 'id', id: wanted.deviceId as MediaDeviceId});
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(subject.state.active).toBe(wanted.deviceId);
        expect(state.status === 'acquired' && state.track.enabled).toBe(false);
    });

    it('keeps the device once it was opened, and only lets go of it when closed', async () => {
        // Arrange
        const subject = await createMicrophone();
        subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        subject.disable();
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
        subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: The platform's own entry for "whichever device the system prefers" is not named.
        // Asking for nothing is what every browser understands.
        expect(asked?.deviceId).toBe(undefined);
        expect(subject.state.capture.status).toBe('acquired');
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
