// Handling of the local media devices of this machine, i.e. microphones, cameras, screen capture
// and speakers. `LocalDevices` is the entry point and builds on everything else in this module.

export type {
    LocalCapture,
    LocalCaptureState,
    LocalDevicesState,
    LocalSelectableCaptureState,
    LocalSelectableSinkState,
    MediaSink,
} from './local-devices-state';
export {LocalDevices} from './local-devices';
export type {
    CapturableMediaDeviceKind,
    EnumerableMediaDevice,
    EnumerableMediaDeviceKind,
    EnumerableMediaDeviceSelection,
} from './media-device';
export {
    MediaDeviceConstraintsError,
    MediaDeviceEnumerationError,
    MediaDeviceError,
    MediaDeviceInUseError,
    MediaDeviceNotFoundError,
    MediaDevicePermissionDeniedBySystemError,
    MediaDevicePermissionDeniedByUserError,
    MediaDevicePermissionError,
    MediaDeviceTimeoutError,
    MediaDeviceUnknownError,
} from './media-device-error';
export {ensureMediaDeviceId, isMediaDeviceId, type MediaDeviceId} from './media-device-id';
