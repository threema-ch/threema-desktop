export type VideoDeviceInfo = MediaDeviceInfo & {kind: 'videoinput'};
export type AudioInputDeviceInfo = MediaDeviceInfo & {kind: 'audioinput'};
export type AudioOutputDeviceInfo = MediaDeviceInfo & {kind: 'audiooutput'};
