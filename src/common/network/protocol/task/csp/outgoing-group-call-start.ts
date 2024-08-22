import {CspE2eGroupControlType, GroupUserState} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Group} from '~/common/model';
import {getIdentityString} from '~/common/model/contact';
import type {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import type {GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTaskCodecHandle,
    type ActiveTask,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessageTask} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {byteEquals} from '~/common/utils/byte';
import {UTF8} from '~/common/utils/codec';

export function createOutgoingCspGroupCallStartTask(
    services: ServicesForTasks,
    group: Group,
    call: GroupCallBaseData,
): OutgoingCspMessageTask<
    structbuf.csp.e2e.GroupMemberContainerEncodable,
    Group,
    CspE2eGroupControlType.GROUP_CALL_START
> {
    return new OutgoingCspMessageTask(services, group, {
        type: CspE2eGroupControlType.GROUP_CALL_START,
        encoder: structbuf.bridge.encoder(structbuf.csp.e2e.GroupMemberContainer, {
            groupId: group.view.groupId,
            creatorIdentity: UTF8.encode(getIdentityString(services.device, group.view.creator)),
            innerData: protobuf.utils.encoder(protobuf.csp_e2e.GroupCallStart, {
                protocolVersion: call.protocolVersion,
                gck: call.gck.unwrap(),
                sfuBaseUrl: call.sfuBaseUrl.raw,
            }),
        }),
        cspMessageFlags: CspMessageFlags.fromPartial({sendPushNotification: true}),
        messageId: randomMessageId(services.crypto),
        createdAt: call.receivedAt,
        allowUserProfileDistribution: true,
    });
}

/**
 * Send an outgoing `GroupCallStart` message.
 */
export class OutgoingGroupCallStartTask implements ActiveTask<void, 'persistent'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _group: ModelStore<Group>,
        private readonly _call: GroupCallBaseData,
    ) {
        this._log = _services.logging.logger('network.protocol.task.out-group-call-start');
    }

    public async run(handle: ActiveTaskCodecHandle<'persistent'>): Promise<void> {
        const group = this._group.get();

        // Ensure we're an active member of the group
        if (!group.controller.lifetimeGuard.active.get()) {
            this._log.info('Discarding because group has been removed');
            return;
        }
        if (group.view.userState !== GroupUserState.MEMBER) {
            this._log.info('Discarding because the user is no longer a member of the group');
            return;
        }

        // Discard if the group call is no longer chosen
        if (
            group.controller.call.run((chosen) => {
                if (chosen === undefined) {
                    return true;
                }
                return !byteEquals(
                    chosen.base.derivations.callId.bytes,
                    this._call.derivations.callId.bytes,
                );
            })
        ) {
            this._log.info('Discarding because group call is no longer chosen');
            return;
        }

        // Note: We omit checking the feature mask here and assume that older clients simply drop
        // our `GroupCallStart` message.
        await createOutgoingCspGroupCallStartTask(this._services, group, this._call).run(handle);
    }
}
