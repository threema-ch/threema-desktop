/* istanbul ignore file -- @preserve: No logic to cover, a test would only restate the mapping. */

/**
 * Base class of failures related to local media device management.
 */
export abstract class MediaDeviceError extends Error {
    public abstract override readonly name: string;
}

/**
 * The page is not allowed to use the device, because the required permission was not given.
 */
export abstract class MediaDevicePermissionError extends MediaDeviceError {}

/**
 * The user did not allow the page to use the device.
 *
 * Note: Also raised if the platform remembered that the user denied it earlier, even if the request
 * never reached the user.
 */
export class MediaDevicePermissionDeniedByUserError extends MediaDevicePermissionError {
    public override readonly name = 'MediaDevicePermissionDeniedByUserError';
}

/**
 * The operating system does not let the browser use the device, so the request never reached the
 * user. They have to allow the browser to use the device in the settings of their operating system
 * first.
 */
export class MediaDevicePermissionDeniedBySystemError extends MediaDevicePermissionError {
    public override readonly name = 'MediaDevicePermissionDeniedBySystemError';
}

/**
 * There is no such device, either because the machine has none of that kind, or because the
 * requested one is no longer attached.
 */
export class MediaDeviceNotFoundError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceNotFoundError';
}

/**
 * The device exists but could not be opened, usually because another application holds it, or
 * because the hardware or its driver failed.
 */
export class MediaDeviceInUseError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceInUseError';
}

/**
 * The device cannot deliver what was asked for, e.g. a resolution it does not support, or the
 * request itself was malformed.
 */
export class MediaDeviceConstraintsError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceConstraintsError';
}

/**
 * The operation did not finish in time.
 *
 * Note: The platform can leave an acquisition pending indefinitely, e.g. while a prompt waits for a
 * user who never answers it, or when a driver stops responding.
 */
export class MediaDeviceTimeoutError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceTimeoutError';
}

/**
 * The operation failed for a reason the platform does not name, or names in a way we do not know.
 */
export class MediaDeviceUnknownError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceUnknownError';
}

/**
 * The available devices could not be determined.
 */
export class MediaDeviceEnumerationError extends MediaDeviceError {
    public override readonly name = 'MediaDeviceEnumerationError';
}

/**
 * Classifies a failure the platform raised while acquiring a device.
 *
 * Note: The platform raises a `DOMException` whose `name` states the reason, and it still uses
 * names from earlier revisions of the specification in some browsers, which is why several of them
 * map to the same failure. A malformed request arrives as a plain `TypeError` instead.
 *
 * @param cause Failure the platform raised.
 * @returns The failure it stands for.
 */
export function toMediaDeviceError(cause: unknown): MediaDeviceError {
    const name = cause instanceof Error ? cause.name : '';
    switch (name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
        case 'SecurityError':
            // The platform raises the very same failure for both kinds of permission rejections,
            // and only says which one it was in the message.
            return String(cause).includes('denied by system')
                ? new MediaDevicePermissionDeniedBySystemError(
                      'The operating system does not allow access to the device',
                      {cause},
                  )
                : new MediaDevicePermissionDeniedByUserError(
                      'Access to the device was not allowed',
                      {cause},
                  );

        case 'NotFoundError':
        case 'DevicesNotFoundError':
            return new MediaDeviceNotFoundError('No such device', {cause});

        case 'NotReadableError':
        case 'TrackStartError':
            return new MediaDeviceInUseError('The device could not be opened', {cause});

        case 'OverconstrainedError':
        case 'ConstraintNotSatisfiedError':
        case 'TypeError':
            return new MediaDeviceConstraintsError('The device cannot deliver what was asked for', {
                cause,
            });

        case 'AbortError':
        case 'TimeoutError':
            return new MediaDeviceTimeoutError('The device could not be opened in time', {cause});

        default:
            return new MediaDeviceUnknownError('The device could not be opened', {cause});
    }
}
