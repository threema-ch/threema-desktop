import type {IdentityString} from '~/common/network/types';
import type {GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {ServicesForViewModel} from '~/common/viewmodel';
import {getRemovedContactData, type RemovedContactData} from '~/common/viewmodel/utils/contact';
import {
    type SelfReceiverData,
    type ContactReceiverData,
    getSelfReceiverData,
    getContactReceiverData,
} from '~/common/viewmodel/utils/receiver';

/** The sender is the user itself. */
export type SenderDataSelf = Pick<
    SelfReceiverData,
    'id' | 'type' | 'color' | 'initials' | 'name' | 'identity' | 'nickname'
>;

/** The sender is a contact. */
export type SenderDataContact = Pick<
    ContactReceiverData,
    'id' | 'type' | 'color' | 'initials' | 'name' | 'identity' | 'lookup'
>;

/** The sender was a contact that has since been removed from the contact list of the user. */
export type SenderDataRemovedContact = RemovedContactData;

/** Data related to a sender. */
export type AnySenderData = SenderDataSelf | SenderDataContact | SenderDataRemovedContact;

/**
 * Returns data related to a sender of a reaction, message, etc.
 *
 * Note: In contrast to `AnyReceiverData`, `AnySenderData` is determined by a Threema ID only.
 * Therefore, it can exist without a corresponding contact entry in the database.
 */
export function getSenderData(
    services: Pick<ServicesForViewModel, 'device' | 'model'>,
    senderIdentity: IdentityString,
    getAndSubscribe: GetAndSubscribeFunction,
): AnySenderData {
    // Special case for the user itself.
    if (senderIdentity === services.device.identity.string) {
        return getSelfReceiverData(services, getAndSubscribe);
    }

    // Handle all other contacts (existing or removed).
    const sender = services.model.contacts.getByIdentity(senderIdentity);
    if (sender === undefined) {
        return getRemovedContactData(senderIdentity);
    }
    return getContactReceiverData(services, getAndSubscribe(sender), getAndSubscribe);
}
