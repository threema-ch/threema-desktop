import type {
    OngoingGroupCallContext,
    OngoingGroupCallController,
    OngoingGroupCall,
} from '~/common/model/group-call';
import type {PropertiesMarked} from '~/common/utils/endpoint';
import type {LocalStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getGroupCallParticipantReceiverData,
    type GroupCallParticipantReceiverData,
} from '~/common/viewmodel/utils/call';
import {getSelfReceiverData, type SelfReceiverData} from '~/common/viewmodel/utils/receiver';
import type {LocalParticipantState, RemoteParticipantState} from '~/common/webrtc/group-call';

export interface LocalParticipantStateViewModel extends LocalParticipantState {
    /** Receiver data. */
    readonly receiver: SelfReceiverData;
}

export interface RemoteParticipantStateViewModel
    extends Pick<RemoteParticipantState, 'id' | 'capture'> {
    /** Receiver data. */
    readonly receiver: GroupCallParticipantReceiverData;
}

export interface OngoingGroupCallStateViewModel {
    /** State of the user. */
    readonly local: LocalParticipantStateViewModel;

    /**
     * A list of all (authenticated) remote participants present in the call.
     *
     * IMPORTANT: This may include contacts more than once, including the user itself!
     */
    readonly remote: readonly RemoteParticipantStateViewModel[];
}

export interface OngoingGroupCallViewModelBundle extends PropertiesMarked {
    readonly context: OngoingGroupCallContext;
    readonly controller: OngoingGroupCallController;
    readonly state: LocalStore<OngoingGroupCallStateViewModel>;
}

export function getOngoingGroupCallViewModelBundle(
    services: Pick<ServicesForViewModel, 'endpoint' | 'model'>,
    ongoing: OngoingGroupCall,
): OngoingGroupCallViewModelBundle {
    const controller = ongoing.get().controller;
    const state = derive([ongoing], ([{currentValue: call}], getAndSubscribe) => {
        const {local, remote} = call.view;
        return {
            local: {...local, receiver: getSelfReceiverData(services, getAndSubscribe)},
            remote: remote.map((participant) => ({
                id: participant.id,
                capture: participant.capture,
                receiver: getGroupCallParticipantReceiverData(
                    services,
                    participant.contact,
                    getAndSubscribe,
                ),
            })),
        };
    });
    return services.endpoint.exposeProperties({context: ongoing.ctx, controller, state});
}
