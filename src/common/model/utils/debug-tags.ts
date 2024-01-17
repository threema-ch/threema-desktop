import type {DbReceiverLookup} from '~/common/db';
import {ReceiverType} from '~/common/enum';
import {unreachable} from '~/common/utils/assert';

/**
 * Return a log tag for the specified receiver.
 */
export function getDebugTagForReceiver(receiver: DbReceiverLookup): string {
    switch (receiver.type) {
        case ReceiverType.CONTACT:
            return `contact.${receiver.uid}`;
        case ReceiverType.DISTRIBUTION_LIST:
            return `distribution-list.${receiver.uid}`;
        case ReceiverType.GROUP:
            return `group.${receiver.uid}`;
        default:
            return unreachable(receiver);
    }
}
