import type {AppServicesForSvelte} from '~/app/types';
import type {ActivityLayout} from '~/app/ui/components/partials/call-activity/helpers';
import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {Dimensions} from '~/common/types';
import type {GroupCallParticipantReceiverData} from '~/common/viewmodel/utils/call';
import type {CaptureState} from '~/common/webrtc/group-call';

export interface ParticipantFeedProps<TType extends 'local' | 'remote'> {
    /**
     * Details about the `activity` this feed is part of.
     */
    readonly activity: {
        readonly layout: ActivityLayout;
    };
    readonly capture: CaptureState;
    /**
     * Reference to the (scroll-)container element this `ParticipantFeed` is part of.
     */
    readonly container: SvelteNullableBinding<HTMLElement>;
    /**
     * Callback which is called when the camera feed should be subscribed.
     *
     * It should be called when:
     *
     * - the video element to render the camera feed is removed/added,
     * - the video element to render the camera feed disappears from or reappears in the viewport.
     *
     * @param dimensions the viewport Dimensions or `undefined` if not in the viewport or no video
     *   should be shown
     */
    readonly updateCameraSubscription: (dimensions: Dimensions | undefined) => void;
    readonly participantId: TType extends 'local' ? 'local' : ParticipantId;
    readonly receiver: GroupCallParticipantReceiverData;
    readonly services: Pick<AppServicesForSvelte, 'profilePicture'>;
    readonly tracks: TType extends 'local'
        ? {
              readonly type: TType;
              readonly camera: MediaStreamTrack | undefined;
          }
        : {
              readonly type: TType;
              readonly microphone: MediaStreamTrack;
              readonly camera: MediaStreamTrack;
          };
    readonly type: TType;
}
