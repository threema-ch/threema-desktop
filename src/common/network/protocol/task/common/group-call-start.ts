import {deriveGroupCallProperties} from '~/common/crypto/group-call';
import type {Group} from '~/common/model';
import type {LocalModelStore} from '~/common/model/utils/model-store';
import type {GroupCallStart} from '~/common/network/protobuf/validate/csp-e2e';
import type {GroupCallBaseData} from '~/common/network/protocol/call/group-call';
import type {ServicesForTasks} from '~/common/network/protocol/task';
import type {IdentityString} from '~/common/network/types';

export function getGroupCallBaseData(
    services: Pick<ServicesForTasks, 'crypto' | 'device'>,
    senderIdentity: IdentityString,
    groupCallStart: GroupCallStart.Type,
    group: LocalModelStore<Group>,
): GroupCallBaseData {
    const init = {
        startedBy: senderIdentity,
        // TODO(DESK-1466): Rather use reflected-at (outgoing), created-at (incoming)
        receivedAt: new Date(),
        protocolVersion: groupCallStart.protocolVersion,
        gck: groupCallStart.gck,
        sfuBaseUrl: groupCallStart.sfuBaseUrl,
    };
    return {
        ...init,
        group,
        derivations: deriveGroupCallProperties(services, group.get().view, init),
    };
}
