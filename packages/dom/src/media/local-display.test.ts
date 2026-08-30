import {waitUntilStable} from '@threema/test-utils';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {type FakeMediaDevices, installFakeMediaDevices} from '../utils/test/fake-media-devices';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {LocalDisplay} from './local-display';
import {
    MediaDeviceInUseError,
    MediaDevicePermissionDeniedBySystemError,
} from './media-device-error';

/**
 * The platform's own implementation, kept before a fake is installed over it.
 */
const PLATFORM = navigator.mediaDevices;

let display: LocalDisplay | undefined;
let registry: EnumerableMediaDeviceRegistry | undefined;
let fake: FakeMediaDevices | undefined;
let captures = 0;

function createDisplay(): LocalDisplay {
    registry = new EnumerableMediaDeviceRegistry();
    display = new LocalDisplay({
        registry,
        onchange: () => undefined,
        acquisitionTimeoutMs: 200,
    });
    return display;
}

/**
 * Installs a fake whose display capture answers with `answer`.
 */
function installPicker(answer: () => MediaStream | Promise<MediaStream>): void {
    fake = installFakeMediaDevices(
        async () => await PLATFORM.enumerateDevices(),
        async () => {
            captures += 1;
            return await answer();
        },
    );
}

beforeEach(() => {
    captures = 0;
});

afterEach(() => {
    display?.close();
    display = undefined;
    registry?.close();
    registry = undefined;
    fake?.restore();
    fake = undefined;
});

describe('LocalDisplay', () => {
    it('captures what the user picked', async () => {
        // Arrange: The browser's fake devices answer a display capture with a camera, which is
        // close enough, because what matters is that a track arrives.
        installPicker(async () => await PLATFORM.getUserMedia({video: true}));
        const subject = createDisplay();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state;
        expect(state.isEnabled).toBe(true);
        expect(state.capture.status).toBe('acquired');
        expect(state.capture.status === 'acquired' && state.capture.track.readyState).toBe('live');
    });

    it('starts and stops sharing when it is toggled', async () => {
        // Arrange
        installPicker(async () => await PLATFORM.getUserMedia({video: true}));
        const subject = createDisplay();

        // Act
        subject.toggle();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.isEnabled).toBe(true);
        expect(subject.state.capture.status).toBe('acquired');

        // Act
        subject.toggle();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.isEnabled).toBe(false);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it("offers nothing to choose from, because the user picks in the platform's own picker", () => {
        // Arrange
        const subject = createDisplay();

        // Assert: There is no device list on the state at all, so nothing has to be hidden.
        expect(Object.keys(subject.state).sort()).toEqual(['capture', 'isEnabled', 'isPending']);
    });

    it('stays off without reporting a failure when the user answers the picker with no', async () => {
        // Arrange
        installPicker(() => {
            throw new DOMException('Permission denied', 'NotAllowedError');
        });
        const subject = createDisplay();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.isEnabled).toBe(false);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('reports a failure when the system withholds the capture', async () => {
        // Arrange
        installPicker(() => {
            throw new DOMException('Permission denied by system', 'NotAllowedError');
        });
        const subject = createDisplay();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(state.status).toBe('failed');
        expect(state.status === 'failed' && state.error).toBeInstanceOf(
            MediaDevicePermissionDeniedBySystemError,
        );
    });

    it('reports a failure which is not about being refused', async () => {
        // Arrange
        installPicker(() => {
            throw new DOMException('Could not start', 'NotReadableError');
        });
        const subject = createDisplay();

        // Act
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        const state = subject.state.capture;
        expect(state.status).toBe('failed');
        expect(state.status === 'failed' && state.error).toBeInstanceOf(MediaDeviceInUseError);
    });

    it('stops when the user ends the capture through the platform, without asking again', async () => {
        // Arrange
        installPicker(async () => await PLATFORM.getUserMedia({video: true}));
        const subject = createDisplay();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const capturing = subject.state.capture;
        expect(capturing.status).toBe('acquired');

        // Act: This is what the platform's own "stop sharing" control does.
        if (capturing.status === 'acquired') {
            capturing.track.dispatchEvent(new Event('ended'));
        }
        await waitUntilStable(() => !subject.state.isPending);

        // Assert: Off, and the picker was not shown to the user again.
        expect(captures).toBe(1);
        expect(subject.state.isEnabled).toBe(false);
        expect(subject.state.capture.status).toBe('inactive');
    });

    it('stops when it is asked to', async () => {
        // Arrange
        installPicker(async () => await PLATFORM.getUserMedia({video: true}));
        const subject = createDisplay();
        await subject.enable();
        await waitUntilStable(() => !subject.state.isPending);
        const capturing = subject.state.capture;

        // Act
        await subject.disable();
        await waitUntilStable(() => !subject.state.isPending);

        // Assert
        expect(subject.state.capture.status).toBe('inactive');
        expect(capturing.status === 'acquired' && capturing.track.readyState).toBe('ended');
    });
});
