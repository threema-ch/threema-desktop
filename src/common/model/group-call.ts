import type {DbGroupUid} from '~/common/db';
import {TRANSFER_HANDLER} from '~/common/index';
import type {LocalModel} from '~/common/model/types/common';
import {ModelLifetimeGuard} from '~/common/model/utils/model-lifetime-guard';
import {LocalModelStore} from '~/common/model/utils/model-store';
import type {Call} from '~/common/network/protocol/call';
import type {
    ServicesForGroupCall,
    GroupCallBaseData,
    GroupCallId,
    ParticipantId,
} from '~/common/network/protocol/call/group-call';
import type {Dimensions, u53} from '~/common/types';
import {PROXY_HANDLER, type ProxyMarked} from '~/common/utils/endpoint';
import type {AbortListener, AbortRaiser} from '~/common/utils/signal';
import type {
    OngoingGroupCallState,
    AnyGroupCallContextAbort,
    GroupCall,
} from '~/common/webrtc/group-call';

export type OngoingGroupCallController = {
    readonly meta: ModelLifetimeGuard<OngoingGroupCallState>;
    readonly abort: AbortListener<AnyGroupCallContextAbort>;
    readonly base: GroupCallBaseData;

    /**
     * Change the local capture state.
     *
     * IMPORTANT: The caller must mute the appropriate local `RTCRtpTransceiver` itself!
     */
    readonly localCaptureState: (device: 'microphone' | 'camera', state: 'on' | 'off') => void;

    /** Subscribe to or unsubscribe from a participant's microphone stream. */
    readonly remoteMicrophone: (
        participantId: ParticipantId,
        intent: 'subscribe' | 'unsubscribe',
    ) => void;

    /** Subscribe to or unsubscribe from a participant's camera stream. */
    readonly remoteCamera: (
        participantId: ParticipantId,
        intent:
            | {readonly type: 'unsubscribe'}
            | {readonly type: 'subscribe'; readonly resolution: Dimensions},
    ) => void;
} & ProxyMarked;

export interface OngoingGroupCallContext {
    readonly type: 'existing' | 'new';
    readonly callId: GroupCallId;
    readonly startedAt: Date;
    readonly maxParticipants: u53;
}

/**
 * Represents a group call that is considered _ongoing_, i.e. a group call the user participates in.
 */
export type OngoingGroupCallModel = LocalModel<
    OngoingGroupCallState,
    OngoingGroupCallController,
    OngoingGroupCallContext,
    'group-call'
>;

export class OngoingGroupCall
    extends LocalModelStore<OngoingGroupCallModel>
    implements Call<'group-call'>
{
    public constructor(
        services: Pick<ServicesForGroupCall, 'logging'>,
        group: DbGroupUid,
        abort: AbortRaiser<AnyGroupCallContextAbort>,
        base: GroupCallBaseData,
        call: GroupCall,
        context: OngoingGroupCallContext,
    ) {
        const tag_ = `group-call.${group}.${context.callId.shortened}`;
        const meta = new ModelLifetimeGuard<OngoingGroupCallState>();
        super(
            call.state.get(),
            {
                [TRANSFER_HANDLER]: PROXY_HANDLER,
                meta,
                abort,
                base,
                localCaptureState: call.localCaptureState.bind(call),
                remoteMicrophone: call.remoteMicrophone.bind(call),
                remoteCamera: call.remoteCamera.bind(call),
            },
            context,
            'group-call',
            {
                debug: {
                    log: services.logging.logger(`model.${tag_}`),
                    tag: tag_,
                },
            },
        );

        // Tie model deactivation to the `AbortRaiser` and derive the view's content.
        //
        // Note: This class and `GroupCall` do not have the exact same lifetime properties. The
        // `GroupCall` protocol bits have already been kicked off at this point which means the
        // state may have changed betwen all the `await`s. Therefore, it is easier and safer to
        // fetch and derive the state from the `GroupCall` continuously instead of sharing a store.
        abort.subscribe(() => meta.deactivate());
        abort.subscribe(
            call.state.subscribe((state) => {
                meta.update(() => state);
            }),
        );
    }
}
