/**
 * Incoming group leave task.
 */
import type {Contact, Group} from '~/common/model';
import {ModelStore} from '~/common/model/utils/model-store';
import type {PassiveTaskCodecHandle, ServicesForTasks} from '~/common/network/protocol/task';
import {GroupLeaveTaskBase} from '~/common/network/protocol/task/common/group-leave';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';

/**
 * Receive and process reflected incoming group leave messages.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedIncomingGroupLeaveTask extends GroupLeaveTaskBase<PassiveTaskCodecHandle> {
    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        senderContact: ModelStore<Contact>,
        container: GroupMemberContainer.Type,
        private readonly _createdAt: Date,
    ) {
        super(services, messageId, senderContact, container, 'reflected-in-group-leave');
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _handleGroupLeaveForUnknownOrLeftGroup(
        handle: PassiveTaskCodecHandle,
    ): Promise<void> {
        if (this._container.creatorIdentity === this._services.device.identity.string) {
            this._log.warn(
                'Discarding group leave for an unknown group where we are supposedly the creator',
            );
            return;
        }
        this._log.debug('Discarding group leave for an unknown or left group');
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _handleMissingSenderContact(
        handle: PassiveTaskCodecHandle,
    ): Promise<ModelStore<Contact>> {
        // This class was instantiated with a ModelStore, so the assertion below is safe.
        assert(this._senderContactOrInit instanceof ModelStore);
        return this._senderContactOrInit;
    }

    /** @inheritdoc */
    // eslint-disable-next-line @typescript-eslint/require-await
    protected async _removeMemberFromGroup(
        handle: PassiveTaskCodecHandle,
        member: ModelStore<Contact>,
        group: ModelStore<Group>,
    ): Promise<boolean> {
        const removedCount = group
            .get()
            .controller.removeMembers.fromSync(handle, [member], this._createdAt);
        return removedCount > 0;
    }
}
