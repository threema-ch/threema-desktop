import {describe, expect, it} from 'vitest';

import type {EnumerableMediaDevice} from './media-device';
import {ensureMediaDeviceId} from './media-device-id';
import {resolveMediaDevice} from './resolve-media-device';

/**
 * Builds a device as the registry would report it.
 */
function createDevice(info: {
    readonly id: string;
    readonly groupId?: string;
    readonly label?: string;
}): EnumerableMediaDevice {
    return {
        id: ensureMediaDeviceId(info.id),
        groupId: info.groupId,
        label: info.label,
    };
}

const FIRST = createDevice({id: 'device-1', groupId: 'group-1', label: 'Built-in'});
const SECOND = createDevice({id: 'device-2', groupId: 'group-2', label: 'Headset'});
const DEVICES = [FIRST, SECOND];

describe('resolveMediaDevice', () => {
    it('asks for no device in particular when the system should decide', () => {
        // Act
        const resolved = resolveMediaDevice(DEVICES, {type: 'system-default'});

        // Assert: The platform's own entry for this is not a device and is not offered as one, so
        // there is nothing to name.
        expect(resolved).toBe(undefined);
    });

    it('asks for the device which was chosen by identifier', () => {
        // Act
        const resolved = resolveMediaDevice(DEVICES, {
            type: 'id',
            id: ensureMediaDeviceId('device-2'),
        });

        // Assert
        expect(resolved).toBe('device-2');
    });

    it('asks for the device which was chosen by name', () => {
        // Act
        const resolved = resolveMediaDevice(DEVICES, {
            type: 'label',
            label: 'Headset',
        });

        // Assert
        expect(resolved).toBe('device-2');
    });

    it('asks for no device in particular when the chosen identifier is not among the devices', () => {
        // Act
        const resolved = resolveMediaDevice([FIRST], {
            type: 'id',
            id: ensureMediaDeviceId('device-2'),
        });

        // Assert
        expect(resolved).toBe(undefined);
    });

    it('asks for no device in particular when the chosen name is not among the devices', () => {
        // Act
        const resolved = resolveMediaDevice([FIRST], {
            type: 'label',
            label: 'Headset',
        });

        // Assert
        expect(resolved).toBe(undefined);
    });

    it('asks for no device in particular while the platform reports none at all', () => {
        // Act
        const resolved = resolveMediaDevice([], {
            type: 'id',
            id: ensureMediaDeviceId('device-1'),
        });

        // Assert
        expect(resolved).toBe(undefined);
    });

    it('takes the first device when several carry the same name', () => {
        // Arrange
        const devices = [
            createDevice({id: 'device-1', groupId: 'group-1', label: 'C920'}),
            createDevice({id: 'device-2', groupId: 'group-2', label: 'C920'}),
        ];

        // Act
        const resolved = resolveMediaDevice(devices, {
            type: 'label',
            label: 'C920',
        });

        // Assert
        expect(resolved).toBe('device-1');
    });
});
