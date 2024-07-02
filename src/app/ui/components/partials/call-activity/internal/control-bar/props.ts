import type {
    AudioDeviceInfo,
    VideoDeviceInfo,
} from '~/app/ui/components/partials/call-activity/internal/control-bar/types';

/**
 * Props accepted by the `ControlBar` component.
 */
export interface ControlBarProps {
    /**
     * The `deviceId` of the currently active audio device.
     */
    readonly currentAudioDeviceId: string | undefined;
    /**
     * The `deviceId` of the currently active video device.
     */
    readonly currentVideoDeviceId: string | undefined;
    /**
     * Whether the user is actively sharing audio with the other call participants.
     */
    readonly isAudioEnabled: boolean;
    /**
     * Whether the user is actively sharing video with the other call participants.
     */
    readonly isVideoEnabled: boolean;
    /**
     * Handler callback which is invoked when a different audio device is selected than that which
     * is currently active.
     */
    onSelectAudioDevice: (device: AudioDeviceInfo) => void;
    /**
     * Handler callback which is invoked when a different video device is selected than that which
     * is currently active.
     */
    onSelectVideoDevice: (device: VideoDeviceInfo) => void;
}
