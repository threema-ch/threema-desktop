import type {AppServices} from '~/app/types';
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
     * Callback which is called when this `ParticipantFeed` enters or exits the viewport of the
     * `container`.
     */
    readonly onEnterOrExitViewport: (isInViewport: boolean, currentSize: Dimensions) => void;
    /**
     * Callback which is called when this `ParticipantFeed` is resized.
     */
    readonly onResize: (size: Dimensions, isInViewport: boolean) => void;
    readonly participantId: TType extends 'local' ? 'local' : ParticipantId;
    readonly receiver: GroupCallParticipantReceiverData;
    readonly services: Pick<AppServices, 'profilePicture'>;
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
