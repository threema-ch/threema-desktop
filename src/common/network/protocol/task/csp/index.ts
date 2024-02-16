import {CspPayloadType} from '~/common/enum';
import type {InboundCspTaskMessage} from '~/common/network/protocol';
import type {RunnableTask, ServicesForTasks} from '~/common/network/protocol/task';
import {IncomingMessageTask} from '~/common/network/protocol/task/csp/incoming-message';
import {unreachable} from '~/common/utils/assert';

export function getTaskForIncomingCspMessage(
    services: ServicesForTasks,
    message: InboundCspTaskMessage['payload'],
): RunnableTask<void> {
    switch (message.type) {
        case CspPayloadType.INCOMING_MESSAGE:
            return new IncomingMessageTask(services, message.payload);
        default:
            return unreachable(message.type);
    }
}
