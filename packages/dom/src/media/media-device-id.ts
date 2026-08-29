import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

/**
 * Identifier of a media device, as the platform reports it.
 *
 * Note: The platform derives this from the device, the origin and the browsing session, so the same
 * device carries a different identifier in another app, and may carry a different one again after
 * the site's data was cleared. It is therefore only meaningful to the app which read it, and only
 * for as long as it keeps its storage.
 *
 * Note: The platform withholds the identifier, i.e. reports an empty string, until the page was
 * granted access to a device of that kind. Such a device has no usable identity, which is what
 * {@link isMediaDeviceId} rejects.
 */
export type MediaDeviceId = WeakOpaque<string, {readonly MediaDeviceId: unique symbol}>;

/**
 * Checks whether the platform reported a usable identifier, i.e. did not withhold it.
 *
 * @param value Value to check.
 * @returns Whether the value is a {@link MediaDeviceId}.
 */
export function isMediaDeviceId(value: string): value is MediaDeviceId {
    return value !== '';
}

/**
 * Ensures the given value is a usable {@link MediaDeviceId}.
 *
 * @param value Value to ensure.
 * @returns The value as a {@link MediaDeviceId}.
 * @throws {Error} If the platform withheld the identifier.
 */
export function ensureMediaDeviceId(value: string): MediaDeviceId {
    if (!isMediaDeviceId(value)) {
        throw new Error('Not a valid media device id: the identifier is empty');
    }
    return value;
}
