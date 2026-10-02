import {waitUntilStable} from '@threema/test-utils';
import {afterEach, describe, expect, it} from 'vitest';

import {TEST_ACQUISITION_TIMEOUT_MS} from '../utils/test/fake-media-devices';

import {LocalDevices} from './local-devices';
import type {LocalDevicesState} from './local-devices-state';

let localDevices: LocalDevices | undefined;

afterEach(() => {
    localDevices?.close();
    localDevices = undefined;
});

describe('LocalDevices', () => {
    it('reports every source of this machine', async () => {
        // Arrange
        localDevices = new LocalDevices({
            acquisitionTimeoutMs: TEST_ACQUISITION_TIMEOUT_MS,
            playbackTimeoutMs: 200,
        });

        // Act
        await waitUntilStable(() => (localDevices?.state.microphone.devices.length ?? 0) > 0);

        // Assert
        const state = localDevices.state;
        expect(state.microphone.capture.status).toBe('inactive');
        expect(state.camera.capture.status).toBe('inactive');
        expect(state.display.capture.status).toBe('inactive');
        expect(state.microphone.devices.length).toBeGreaterThan(0);
        expect(state.camera.devices.length).toBeGreaterThan(0);
        expect(state.speaker.sink).not.toBe(undefined);
    });

    it('gives the platform time to settle', async () => {
        // Act
        localDevices = new LocalDevices();
        await waitUntilStable(() => (localDevices?.state.camera.devices.length ?? 0) > 0);

        // Assert
        expect(localDevices.state.camera.devices.length).toBeGreaterThan(0);
        expect(localDevices.state.camera.capture.status).toBe('inactive');

        // Act
        await localDevices.camera.enable();
        await waitUntilStable(() => localDevices?.state.camera.isPending === false);

        // Assert
        expect(localDevices.state.camera.capture.status).toBe('acquired');
    });

    it('tells a subscriber about a change of any source', async () => {
        // Arrange
        localDevices = new LocalDevices({
            acquisitionTimeoutMs: TEST_ACQUISITION_TIMEOUT_MS,
            playbackTimeoutMs: 200,
        });
        const seen: LocalDevicesState[] = [];
        const unsubscribe = localDevices.subscribe((state) => {
            seen.push(state);
        });

        // Act
        await localDevices.camera.enable();
        await waitUntilStable(() => localDevices?.state.camera.isPending === false);

        // Assert
        expect(seen.length).toBeGreaterThan(0);
        expect(seen.at(-1)?.camera.capture.status).toBe('acquired');

        // Act
        const before = seen.length;
        unsubscribe();
        await localDevices.camera.disable();
        await waitUntilStable(() => localDevices?.state.camera.isPending === false);

        // Assert
        expect(seen).toHaveLength(before);
    });

    it('does not let a failing subscriber break the others', async () => {
        // Arrange
        localDevices = new LocalDevices({
            acquisitionTimeoutMs: TEST_ACQUISITION_TIMEOUT_MS,
            playbackTimeoutMs: 200,
        });
        let reached = false;
        localDevices.subscribe(() => {
            throw new Error('This subscriber is broken');
        });
        localDevices.subscribe(() => {
            reached = true;
        });

        // Act
        await localDevices.camera.enable();
        await waitUntilStable(() => localDevices?.state.camera.isPending === false);

        // Assert
        expect(reached).toBe(true);
    });

    it('lets go of all resources when it is closed', async () => {
        // Arrange
        localDevices = new LocalDevices({
            acquisitionTimeoutMs: TEST_ACQUISITION_TIMEOUT_MS,
            playbackTimeoutMs: 200,
        });
        await localDevices.microphone.enable();
        await localDevices.camera.enable();
        await waitUntilStable(() => {
            const state = localDevices?.state;
            return state?.camera.isPending === false && !state.microphone.isPending;
        });
        const {camera, microphone} = localDevices.state;
        expect(camera.capture.status).toBe('acquired');
        expect(microphone.capture.status).toBe('acquired');

        // Act
        localDevices.close();

        // Assert
        expect(camera.capture.status === 'acquired' && camera.capture.track.readyState).toBe(
            'ended',
        );
        expect(
            microphone.capture.status === 'acquired' && microphone.capture.track.readyState,
        ).toBe('ended');
        expect(localDevices.state.camera.capture.status).toBe('inactive');
    });

    it('makes the platform reveal the names it withholds', async () => {
        // Arrange
        localDevices = new LocalDevices({
            acquisitionTimeoutMs: TEST_ACQUISITION_TIMEOUT_MS,
            playbackTimeoutMs: 200,
        });

        // Act
        const failure = await localDevices.reveal();

        // Assert
        expect(failure).toBe(undefined);
        expect(
            localDevices.state.microphone.devices.every((device) => device.label !== undefined),
        ).toBe(true);
    });
});
