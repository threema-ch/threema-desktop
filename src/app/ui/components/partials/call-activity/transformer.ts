import type {WebRtcServiceProvider} from '~/common/dom/webrtc';
import type {ParticipantTransceivers} from '~/common/dom/webrtc/group-call';
import type {RemoteModelController} from '~/common/model';
import type {OngoingGroupCallContext, OngoingGroupCallController} from '~/common/model/group-call';
import {assert} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {RemoteAbortListener} from '~/common/utils/signal';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import type {
    LocalParticipantStateViewModel,
    OngoingGroupCallViewModelBundle,
    RemoteParticipantStateViewModel,
} from '~/common/viewmodel/group-call/activity';
import type {AnyGroupCallContextAbort} from '~/common/webrtc/group-call';

export interface AugmentedLocalParticipantStateViewModel extends LocalParticipantStateViewModel {
    /** Associated transceivers. */
    readonly transceivers: ParticipantTransceivers;
}

export interface AugmentedRemoteParticipantStateViewModel extends RemoteParticipantStateViewModel {
    /** Associated transceivers. */
    readonly transceivers: ParticipantTransceivers;
}

export interface AugmentedOngoingGroupCallStateViewModel {
    /** State of the user. */
    readonly local: AugmentedLocalParticipantStateViewModel;

    /**
     * A list of all (authenticated) remote participants present in the call.
     *
     * IMPORTANT: This may include contacts more than once, including the user itself!
     */
    readonly remote: readonly AugmentedRemoteParticipantStateViewModel[];
}

export interface AugmentedOngoingGroupCallViewModelBundle {
    readonly abort: RemoteAbortListener<AnyGroupCallContextAbort>;
    readonly context: OngoingGroupCallContext;
    readonly controller: RemoteModelController<OngoingGroupCallController>;
    readonly state: IQueryableStore<AugmentedOngoingGroupCallStateViewModel>;
}

export async function transformOngoingGroupCallProps(
    webRtc: WebRtcServiceProvider,
    ongoing: Remote<OngoingGroupCallViewModelBundle>,
): Promise<AugmentedOngoingGroupCallViewModelBundle> {
    // Lookup associated group call context, i.e. the place where the `RTCPeerConnection` and all
    // associated `RTCRtpTransceiver`s live.
    const handle = webRtc.getGroupCallContextHandle(ongoing.context.callId);
    assert(handle !== undefined, 'Associated group call context handle must exist');

    const abort = await ongoing.controller.abort;
    const state = derive([ongoing.state], ([{currentValue: call}]) => ({
        local: {
            ...call.local,
            transceivers: handle.local.transceivers,
        },
        remote: call.remote.map((participant) => {
            const transceivers = handle.remote.get(participant.id)?.transceivers;
            assert(transceivers !== undefined, "Associated participant's transceivers must exist");
            return {
                ...participant,
                transceivers,
            };
        }),
    }));
    return {abort, context: ongoing.context, controller: ongoing.controller, state};
}
