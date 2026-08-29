import type {MediaDeviceId} from './media-device-id';

/**
 * Kind of a media device which can be captured from, i.e. it provides an input media stream.
 */
export type CapturableMediaDeviceKind = 'camera' | 'display' | 'microphone';

/**
 * Kind of a media device which can be enumerated, i.e. the platform can provide multiple device
 * options for this kind.
 */
export type EnumerableMediaDeviceKind = 'camera' | 'microphone' | 'speaker';

/**
 * Identifies a specific media device of any kind.
 */
export interface EnumerableMediaDevice {
    readonly id: MediaDeviceId;
    /**
     * Identifier of the physical device this one belongs to, or `undefined` if the platform
     * withheld it. Two entries sharing it are the same hardware, e.g. the microphone and the camera
     * of one webcam.
     */
    readonly groupId: string | undefined;
    /**
     * Name of the device, or `undefined` while the platform withholds it, which it does until the
     * page was granted access to a device of that kind. A consumer which wants to offer devices
     * before that happened has to name them itself, e.g. "Microphone 1".
     */
    readonly label: string | undefined;
}

/**
 * Describes the device a consumer asked for.
 */
export type EnumerableMediaDeviceSelection =
    | {readonly type: 'system-default'}
    | {readonly type: 'id'; readonly id: MediaDeviceId}
    | {readonly type: 'label'; readonly label: string};
