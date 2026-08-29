import {unreachable} from '@threema/ts-utils/meta/unreachable';

import type {EnumerableMediaDevice, EnumerableMediaDeviceSelection} from './media-device';
import type {MediaDeviceId} from './media-device-id';

/**
 * Picks the id of the desired device from the given list of `devices` which matches the given
 * `selection`.
 *
 * Note: If the selected device is not found in the list or `'system-default'` is requested
 * explicitly, this returns `undefined`.
 */
export function resolveMediaDevice(
    devices: readonly EnumerableMediaDevice[],
    selection: EnumerableMediaDeviceSelection,
): MediaDeviceId | undefined {
    switch (selection.type) {
        case 'id':
            return devices.find((candidate) => candidate.id === selection.id)?.id;

        case 'label':
            return devices.find((candidate) => candidate.label === selection.label)?.id;

        case 'system-default':
            return undefined;

        /* istanbul ignore next -- @preserve: Unreachable. */
        default:
            return unreachable(selection);
    }
}
