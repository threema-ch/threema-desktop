/**
 * Incoming group leave task.
 */
import {AcquaintanceLevel} from '~/common/enum';
import type {Contact, ContactInit, Group} from '~/common/model';
import {ModelStore} from '~/common/model/utils/model-store';
import type {ActiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {
    addGroupContacts,
    sendGroupSyncRequest,
} from '~/common/network/protocol/task/common/group-helpers';
import {GroupLeaveTaskBase} from '~/common/network/protocol/task/common/group-leave';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {assert, unwrap} from '~/common/utils/assert';

/**
 * Receive and process incoming group leave messages.
 */
export class IncomingGroupLeaveTask extends GroupLeaveTaskBase<ActiveTaskCodecHandle<'volatile'>> {
    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        senderContactOrInit: ModelStore<Contact> | ContactInit,
        container: GroupMemberContainer.Type,
        private readonly _createdAt: Date,
    ) {
        super(services, messageId, senderContactOrInit, container, 'in-group-leave');
    }

    /** @inheritdoc */
    protected async _handleGroupLeaveForUnknownOrLeftGroup(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<void> {
        const {device, model} = this._services;

        // Extract relevant fields
        const creatorIdentity = this._container.creatorIdentity;
        const groupId = this._container.groupId;

        // 3.1 If the user is the creator of the group, abort these steps
        if (creatorIdentity === device.identity.string) {
            this._log.warn(
                'Discarding group leave for an unknown group where we are supposedly the creator',
            );
            return;
        }

        // 3.2 Send a group-sync-request to the group creator and abort these steps
        let creator = model.contacts.getByIdentity(creatorIdentity)?.get();
        if (creator === undefined) {
            const addedContacts = await addGroupContacts(
                [creatorIdentity],
                handle,
                this._services,
                this._log,
            );
            if (addedContacts.length < 1) {
                this._log.warn(
                    `Discarding group leave with unknown creator (${creatorIdentity}) that cannot be added to the address book.`,
                );
                return;
            }
            assert(addedContacts.length === 1, 'addedContacts contained more than one contact');
            creator = unwrap(addedContacts[0]).get();
        }
        this._log.info(`Sending group sync request for group ${this._groupDebugString}`);
        await sendGroupSyncRequest(groupId, creator, handle, this._services);
    }

    /** @inheritdoc */
    protected async _handleMissingSenderContact(
        handle: ActiveTaskCodecHandle<'volatile'>,
    ): Promise<ModelStore<Contact>> {
        const {model} = this._services;

        if (this._senderContactOrInit instanceof ModelStore) {
            return this._senderContactOrInit;
        }

        this._log.debug('Received group leave from unknown user. Adding user.');
        return await model.contacts.add.fromRemote(handle, {
            ...this._senderContactOrInit,
            acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
        });
    }

    /** @inheritdoc */
    protected async _removeMemberFromGroup(
        handle: ActiveTaskCodecHandle<'volatile'>,
        member: ModelStore<Contact>,
        group: ModelStore<Group>,
    ): Promise<boolean> {
        const removedCount = await group
            .get()
            .controller.removeMembers.fromRemote(handle, [member], this._createdAt);
        return removedCount > 0;
    }
}
