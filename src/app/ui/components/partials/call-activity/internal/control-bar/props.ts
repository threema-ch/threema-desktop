/**
 * Props accepted by the `ControlBar` component.
 */
export interface ControlBarProps {
    /**
     * Whether the user is actively sharing audio with the other call participants.
     */
    readonly isAudioEnabled: boolean;
    /**
     * Whether the user is actively sharing video with the other call participants.
     */
    readonly isVideoEnabled: boolean;
}
