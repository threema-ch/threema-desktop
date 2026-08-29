import {afterEach, describe, expect, it, vi} from 'vitest';

import {
    createFakeMediaDeviceInfo,
    installFakeMediaDevices,
    type FakeMediaDevices,
} from '../utils/test/fake-media-devices';

import {EnumerableMediaDeviceRegistry} from './enumerable-media-device-registry';
import {MediaDeviceEnumerationError, MediaDevicePermissionError} from './media-device-error';

let registry: EnumerableMediaDeviceRegistry | undefined;
let fake: FakeMediaDevices | undefined;

/**
 * Note: The registry is closed before the fake is restored, because it detaches its listener from
 * whichever `navigator.mediaDevices` it attached to.
 */
afterEach(() => {
    registry?.close();
    registry = undefined;
    fake?.restore();
    fake = undefined;
});

describe('MediaDeviceRegistry', () => {
    it('reports the devices of the machine, grouped by kind', async () => {
        // Arrange
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        await registry.refresh();

        // Assert: The browser is launched with a deterministic set of devices, see
        // `vitest.config.ts`. The audio kinds have two devices each, plus an entry aliasing the
        // system default which is not reported as a device of its own.
        const {microphones, cameras, speakers} = registry.devices;
        expect(microphones).toHaveLength(2);
        expect(cameras).toHaveLength(3);
        expect(speakers).toHaveLength(2);
        for (const device of [...microphones, ...cameras, ...speakers]) {
            expect(device.id).not.toBe('');
            expect(device.label).not.toBe(undefined);
            expect(device.groupId).not.toBe(undefined);
        }
    });

    it("leaves out the platform's own aliases, which are not devices of their own", async () => {
        // Arrange
        fake = installFakeMediaDevices(() => [
            createFakeMediaDeviceInfo({
                deviceId: 'default',
                groupId: 'group-1',
                kind: 'audioinput',
                label: 'Default - Mic 1',
            }),
            createFakeMediaDeviceInfo({
                deviceId: 'communications',
                groupId: 'group-1',
                kind: 'audioinput',
                label: 'Communications - Mic 1',
            }),
            createFakeMediaDeviceInfo({
                deviceId: 'mic-1',
                groupId: 'group-1',
                kind: 'audioinput',
                label: 'Mic 1',
            }),
        ]);
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        await registry.refresh();

        // Assert: Virtual devices have been filtered out, and only the one real device was added to
        // the registry.
        expect(registry.devices.microphones.map((device) => device.id)).toEqual(['mic-1']);
    });

    it('ignores a device whose identifier the platform withheld', async () => {
        // Arrange
        fake = installFakeMediaDevices(() => [
            createFakeMediaDeviceInfo({kind: 'audioinput'}),
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ]);
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        await registry.refresh();

        // Assert
        expect(registry.devices.microphones).toHaveLength(1);
        expect(registry.devices.microphones[0]?.id).toBe('mic-1');
    });

    it('ignores a kind the platform does not define today', async () => {
        // Arrange
        fake = installFakeMediaDevices(() => [
            createFakeMediaDeviceInfo({deviceId: 'x-1', kind: 'brainwaveinput', label: 'Brain'}),
        ]);
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        await registry.refresh();

        // Assert
        expect(registry.devices).toStrictEqual({microphones: [], cameras: [], speakers: []});
    });

    it('reports a withheld name and group as unknown', async () => {
        // Arrange
        fake = installFakeMediaDevices(() => [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput'}),
        ]);
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        await registry.refresh();

        // Assert
        expect(registry.devices.microphones[0]).toStrictEqual({
            id: 'mic-1',
            groupId: undefined,
            label: undefined,
        });
    });

    it('notifies subscribers when the devices changed', async () => {
        // Arrange
        let devices = [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ];
        fake = installFakeMediaDevices(() => devices);
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const listener = vi.fn();
        registry.subscribe(listener);

        // Act
        devices = [
            ...devices,
            createFakeMediaDeviceInfo({deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2'}),
        ];
        fake.dispatchDeviceChange();
        // Note: Queues behind the refresh the event triggered, which is enqueued synchronously.
        await registry.refresh();

        // Assert
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenLastCalledWith(registry.devices);
        expect(registry.devices.microphones).toHaveLength(2);
    });

    it('notifies nobody when a reported change reports the same devices', async () => {
        // Arrange
        const devices = [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ];
        fake = installFakeMediaDevices(() => devices);
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const listener = vi.fn();
        registry.subscribe(listener);

        // Act
        fake.dispatchDeviceChange();
        await registry.refresh();

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });

    it('notifies nobody after the subscription was cancelled', async () => {
        // Arrange
        let devices = [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ];
        fake = installFakeMediaDevices(() => devices);
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const listener = vi.fn();
        const unsubscribe = registry.subscribe(listener);

        // Act
        unsubscribe();
        devices = [
            ...devices,
            createFakeMediaDeviceInfo({deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2'}),
        ];
        await registry.refresh();

        // Assert
        expect(listener).not.toHaveBeenCalled();
    });

    it('notifies the other subscribers when one of them fails', async () => {
        // Arrange
        let devices = [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ];
        fake = installFakeMediaDevices(() => devices);
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const failing = vi.fn(() => {
            throw new Error('Subscriber failed');
        });
        const listener = vi.fn();
        registry.subscribe(failing);
        registry.subscribe(listener);

        // Act
        devices = [
            ...devices,
            createFakeMediaDeviceInfo({deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2'}),
        ];
        await registry.refresh();

        // Assert
        expect(failing).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps the devices it knows when the platform fails to report them on refresh', async () => {
        // Arrange
        let fails = false;
        fake = installFakeMediaDevices(async () =>
            fails
                ? await Promise.reject(new Error('Enumeration failed'))
                : [
                      createFakeMediaDeviceInfo({
                          deviceId: 'mic-1',
                          kind: 'audioinput',
                          label: 'Mic 1',
                      }),
                  ],
        );
        registry = new EnumerableMediaDeviceRegistry();
        await registry.refresh();
        const listener = vi.fn();
        registry.subscribe(listener);

        // Act
        fails = true;
        fake.dispatchDeviceChange();
        await registry.refresh();

        // Assert
        expect(listener).not.toHaveBeenCalled();
        expect(registry.devices.microphones).toHaveLength(1);
    });

    it('reports the failure when the platform cannot report its devices', async () => {
        // Arrange
        const cause = new Error('Enumeration failed');
        fake = installFakeMediaDevices(async () => await Promise.reject(cause));
        registry = new EnumerableMediaDeviceRegistry();

        // Act
        const result = await registry.refresh();

        // Assert
        expect(result).toBeInstanceOf(MediaDeviceEnumerationError);
        expect((result as MediaDeviceEnumerationError).cause).toBe(cause);
    });

    it('stops watching the platform after it was closed', async () => {
        // Arrange
        let devices = [
            createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput', label: 'Mic 1'}),
        ];
        fake = installFakeMediaDevices(() => devices);
        const closed = new EnumerableMediaDeviceRegistry();
        await closed.refresh();
        const listener = vi.fn();
        closed.subscribe(listener);

        // Act
        closed.close();
        devices = [
            ...devices,
            createFakeMediaDeviceInfo({deviceId: 'mic-2', kind: 'audioinput', label: 'Mic 2'}),
        ];
        fake.dispatchDeviceChange();
        // Note: Nothing to await on the registry itself, so give an unwanted refresh a chance to run.
        await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
        });

        // Assert
        expect(listener).not.toHaveBeenCalled();
        expect(closed.devices.microphones).toHaveLength(1);
    });

    describe('reveal', () => {
        it('makes the platform reveal the names it withheld, and reads the devices again', async () => {
            // Arrange
            const platform = navigator.mediaDevices;
            let isUnlocked = false;
            fake = installFakeMediaDevices(
                () => [
                    createFakeMediaDeviceInfo({
                        deviceId: 'mic-1',
                        kind: 'audioinput',
                        label: isUnlocked ? 'Mic 1' : '',
                    }),
                ],
                async (constraints) => {
                    isUnlocked = true;
                    return await platform.getUserMedia(constraints);
                },
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBe(undefined);
            expect(registry.devices.microphones[0]?.label).toBe('Mic 1');
        });

        it('asks the platform for nothing when every name is already known', async () => {
            // Arrange
            const capture = vi.fn();
            fake = installFakeMediaDevices(
                () => [
                    createFakeMediaDeviceInfo({
                        deviceId: 'mic-1',
                        kind: 'audioinput',
                        label: 'Mic 1',
                    }),
                ],
                capture,
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBe(undefined);
            expect(capture).not.toHaveBeenCalled();
        });

        it('asks for the microphone alone when the machine has no camera', async () => {
            // Arrange
            const platform = navigator.mediaDevices;
            let isUnlocked = false;
            fake = installFakeMediaDevices(
                () => [
                    createFakeMediaDeviceInfo({
                        deviceId: 'mic-1',
                        kind: 'audioinput',
                        label: isUnlocked ? 'Mic 1' : '',
                    }),
                ],
                async (constraints) => {
                    if (constraints.video !== undefined) {
                        throw new DOMException('Requested device not found', 'NotFoundError');
                    }
                    isUnlocked = true;
                    return await platform.getUserMedia(constraints);
                },
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBe(undefined);
            expect(registry.devices.microphones[0]?.label).toBe('Mic 1');
        });

        it('reports the failure when the names cannot be revealed', async () => {
            // Arrange
            fake = installFakeMediaDevices(
                () => [createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput'})],
                async () =>
                    await Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBeInstanceOf(MediaDevicePermissionError);
        });

        it('reports the failure when the platform cannot report its devices', async () => {
            // Arrange
            fake = installFakeMediaDevices(
                async () => await Promise.reject(new Error('Enumeration failed')),
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBeInstanceOf(MediaDeviceEnumerationError);
        });

        it('reports the failure when the devices cannot be read once they were revealed', async () => {
            // Arrange
            const platform = navigator.mediaDevices;
            let enumerations = 0;
            fake = installFakeMediaDevices(
                async () => {
                    enumerations += 1;
                    return enumerations > 1
                        ? await Promise.reject(new Error('Enumeration failed'))
                        : [createFakeMediaDeviceInfo({deviceId: 'mic-1', kind: 'audioinput'})];
                },
                async (constraints) => await platform.getUserMedia(constraints),
            );
            registry = new EnumerableMediaDeviceRegistry();

            // Act
            const result = await registry.reveal();

            // Assert
            expect(result).toBeInstanceOf(MediaDeviceEnumerationError);
        });
    });
});
