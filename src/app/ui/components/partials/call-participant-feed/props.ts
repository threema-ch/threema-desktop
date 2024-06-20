import type {AppServices} from '~/app/types';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {GroupCallParticipantReceiverData} from '~/common/viewmodel/utils/call';
import type {CaptureState} from '~/common/webrtc/group-call';

export interface ParticipantFeedProps<TType extends 'local' | 'remote'> {
    readonly services: Pick<AppServices, 'profilePicture'>;
    readonly type: TType;
    readonly receiver: GroupCallParticipantReceiverData;
    readonly participantId: TType extends 'local' ? 'local' : ParticipantId;
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
    readonly capture: CaptureState;
}
