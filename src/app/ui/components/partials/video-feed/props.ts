import type {AppServices} from '~/app/types';
import type {ProfilePictureProps} from '~/app/ui/components/partials/profile-picture/props';
import type {AnyReceiverDataOrSelf} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `VideoFeed` component.
 */
export interface VideoFeedProps {
    // TODO(DESK-1447): Pass actual video and audio streams. Note: `isAudioEnabled` and
    // `isVideoEnabled` could still be useful (depending on the back-end implementation), e.g., if
    // we want to define 3 states: "video is enabled and stream is active", "video is enabled and
    // stream is loading or broken", "video is disabled".
    /**
     * Whether the audio stream belonging to this feed is actively subscribed.
     */
    readonly isAudioEnabled: boolean;
    /**
     * Whether the video stream belonging to this feed is actively subscribed.
     */
    readonly isVideoEnabled: boolean;
    /** Receiver this `VideoFeed` belongs to. */
    readonly receiver: Pick<AnyReceiverDataOrSelf, 'name' | 'color'> &
        ProfilePictureProps['receiver'];
    readonly services: Pick<AppServices, 'profilePicture'>;
}
