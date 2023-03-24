import type * as protobuf from '~/common/network/protobuf';
import {type PassiveTask, type ServicesForTasks} from '~/common/network/protocol/task';
import {TechDebtTask} from '~/common/network/protocol/task/tech-debt';
import type * as structbuf from '~/common/network/structbuf/';
import {unreachable} from '~/common/utils/assert';

import {ReflectedContactSyncTask} from './reflected-contact-sync';
import {ReflectedGroupSyncTask} from './reflected-group-sync';
import {ReflectedIncomingMessageTask} from './reflected-incoming-message';
import {ReflectedIncomingMessageUpdateTask} from './reflected-incoming-message-update';
import {ReflectedOutgoingMessageTask} from './reflected-outgoing-message';
import {ReflectedOutgoingMessageUpdateTask} from './reflected-outgoing-message-update';
import {ReflectedSettingsSyncTask} from './reflected-settings-sync';
import {ReflectedUserProfileSyncTask} from './reflected-user-profile-sync';

export function getTaskForIncomingD2dMessage(
    services: ServicesForTasks,
    envelope: protobuf.validate.d2d.Envelope.Type,
    reflected: structbuf.validate.d2m.payload.Reflected.Type,
): PassiveTask<void> {
    switch (envelope.content) {
        case 'contactSync':
            return new ReflectedContactSyncTask(services, envelope.contactSync);
        case 'groupSync':
            return new ReflectedGroupSyncTask(services, envelope.groupSync);
        case 'outgoingMessage':
            return new ReflectedOutgoingMessageTask(
                services,
                envelope.outgoingMessage,
                reflected.timestamp,
            );
        case 'incomingMessage':
            return new ReflectedIncomingMessageTask(
                services,
                envelope.incomingMessage,
                reflected.timestamp,
            );
        case 'incomingMessageUpdate':
            return new ReflectedIncomingMessageUpdateTask(
                services,
                envelope.incomingMessageUpdate,
                reflected.timestamp,
            );
        case 'outgoingMessageUpdate':
            return new ReflectedOutgoingMessageUpdateTask(
                services,
                envelope.outgoingMessageUpdate,
                reflected.timestamp,
            );
        case 'userProfileSync':
            return new ReflectedUserProfileSyncTask(services, envelope.userProfileSync);
        case 'settingsSync':
            return new ReflectedSettingsSyncTask(services, envelope.settingsSync);
        case 'distributionListSync':
            return new TechDebtTask(services, `Handle inbound D2D ${envelope.content}`);
        default:
            return unreachable(envelope);
    }
}
