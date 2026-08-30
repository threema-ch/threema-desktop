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
export function isMediaDeviceId(value: unknown): value is MediaDeviceId {
    return typeof value === 'string' && value !== '';
}

/**
 * Ensures the given value is a usable {@link MediaDeviceId}.
 *
 * @param value Value to ensure.
 * @returns The value as a {@link MediaDeviceId}.
 * @throws {Error} If the platform withheld the identifier.
 */
export function ensureMediaDeviceId(value: unknown): MediaDeviceId {
    if (!isMediaDeviceId(value)) {
        throw new Error('Not a valid media device id: the identifier is empty');
    }
    return value;
}

/**
 * Identifiers of entries which are not devices of their own, but are aliases for a real device.
 * Included by Chromium in the list of enumerated devices, in addition to the real device itself, so
 * some devices would appear twice if aliases are not filtered out.
 */
const ALIAS_MEDIA_DEVICE_IDS: readonly string[] = ['default', 'communications'];

/**
 * Checks whether the given `value` is a {@link MediaDeviceId} and belongs to a known alias (virtual
 * media device).
 *
 * @param value Value to check.
 * @returns Whether the value is an alias of the platform.
 */
export function isAliasMediaDeviceId(value: unknown): value is MediaDeviceId {
    return isMediaDeviceId(value) && ALIAS_MEDIA_DEVICE_IDS.includes(value);
}
