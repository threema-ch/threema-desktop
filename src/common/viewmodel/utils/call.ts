import {GroupCallPolicy, GroupUserState, ReceiverType} from '~/common/enum';
import type {AnyReceiver, Contact} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {ChosenGroupCall, GroupCallId} from '~/common/network/protocol/call/group-call';
import {unreachable} from '~/common/utils/assert';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {
    getContactReceiverData,
    getSelfReceiverData,
    type ContactReceiverData,
    type SelfReceiverData,
} from '~/common/viewmodel/utils/receiver';

export type AnyCallData = GroupCallData;

export type GroupCallParticipantReceiverData =
    | Pick<ContactReceiverData, 'color' | 'initials' | 'lookup' | 'name' | 'type'>
    | Pick<SelfReceiverData, 'color' | 'initials' | 'name' | 'type'>;

export interface GroupCallData {
    readonly id: GroupCallId;
    readonly joined: boolean;
    readonly startedAt: Date;
    readonly participants: readonly GroupCallParticipantReceiverData[] | undefined;
}

export function getGroupCallParticipantReceiverData(
    services: Pick<ServicesForViewModel, 'model'>,
    participant: LocalModelStore<Contact> | 'me',
    getAndSubscribe: GetAndSubscribeFunction,
): GroupCallParticipantReceiverData {
    return participant === 'me'
        ? getSelfReceiverData(services, getAndSubscribe)
        : getContactReceiverData(services, getAndSubscribe(participant), getAndSubscribe);
}

/** Collect group call data from a _chosen_ group call. */
function getGroupCallData(
    services: Pick<ServicesForViewModel, 'model'>,
    call: ChosenGroupCall,
    getAndSubscribe: GetAndSubscribeFunction,
): GroupCallData {
    switch (call.type) {
        case 'peeked':
            return {
                id: call.base.derivations.callId,
                joined: false,
                startedAt: call.state.startedAt,
                participants: call.state.participants?.map((participant) =>
                    getGroupCallParticipantReceiverData(services, participant, getAndSubscribe),
                ),
            };
        case 'ongoing': {
            const state = getAndSubscribe(call.call);
            return {
                id: call.base.derivations.callId,
                joined: true,
                startedAt: call.call.ctx.startedAt,
                participants: [
                    getSelfReceiverData(services, getAndSubscribe),
                    ...state.view.remote.map((participant) =>
                        getGroupCallParticipantReceiverData(
                            services,
                            participant.contact,
                            getAndSubscribe,
                        ),
                    ),
                ],
            };
        }
        default:
            return unreachable(call);
    }
}

/** Collect any call data from a receiver. */
export function getCallData(
    services: Pick<ServicesForViewModel, 'model'>,
    receiver: AnyReceiver,
    getAndSubscribe: GetAndSubscribeFunction,
): AnyCallData | undefined {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return undefined;
        case ReceiverType.GROUP: {
            const callsSettings = getAndSubscribe(services.model.user.callsSettings);
            if (callsSettings.view.groupCallPolicy === GroupCallPolicy.DENY_GROUP_CALL) {
                return undefined;
            }
            if (receiver.view.userState !== GroupUserState.MEMBER) {
                return undefined;
            }
            const call = getAndSubscribe(receiver.controller.call);
            if (call === undefined) {
                return undefined;
            }
            return getGroupCallData(services, call, getAndSubscribe);
        }
        case ReceiverType.DISTRIBUTION_LIST:
            return undefined;
        default:
            return unreachable(receiver);
    }
}
