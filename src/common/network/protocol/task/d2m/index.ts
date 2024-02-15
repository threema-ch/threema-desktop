import {D2mPayloadType, D2mPayloadTypeUtils} from '~/common/enum';
import type {InboundD2mTaskMessage} from '~/common/network/protocol';
import type {RunnableTask, ServicesForTasks} from '~/common/network/protocol/task';
import {TechDebtTask} from '~/common/network/protocol/task/tech-debt';
import {unreachable} from '~/common/utils/assert';

import {ReflectedTask} from './reflected';

export function getTaskForIncomingL5D2mMessage(
    services: ServicesForTasks,
    message: InboundD2mTaskMessage,
): RunnableTask<void> {
    switch (message.type) {
        case D2mPayloadType.DEVICES_INFO:
            return new TechDebtTask(
                services,
                `Handle inbound D2M ${D2mPayloadTypeUtils.NAME_OF[message.type]}`,
            );
        case D2mPayloadType.REFLECTED:
            return new ReflectedTask(services, message.payload);
        default:
            return unreachable(message);
    }
}
