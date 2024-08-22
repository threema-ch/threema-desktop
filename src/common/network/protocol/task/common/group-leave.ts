/**
 * Incoming group leave task.
 */
import {GroupUserState} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit, Group} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Base class for handling CSP or D2D incoming group leave messages.
 */
export abstract class GroupLeaveTaskBase<
    TTaskCodecHandleType extends PassiveTaskCodecHandle | ActiveTaskCodecHandle<'volatile'>,
> implements ComposableTask<TTaskCodecHandleType, void>
{
    protected readonly _log: Logger;
    protected readonly _senderIdentity: IdentityString;
    protected readonly _groupDebugString: string;

    public constructor(
        protected readonly _services: ServicesForTasks,
        messageId: MessageId,
        protected readonly _senderContactOrInit: ModelStore<Contact> | ContactInit,
        protected readonly _container: GroupMemberContainer.Type,
        taskName: string,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(`network.protocol.task.${taskName}.${messageIdHex}`);
        if (_senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(_container.creatorIdentity, _container.groupId);
    }

    public async run(handle: TTaskCodecHandleType): Promise<void> {
        const {model} = this._services;

        this._log.info(
            `Processing group leave from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const senderIdentity = this._senderIdentity;
        const creatorIdentity = this._container.creatorIdentity;
        const groupId = this._container.groupId;

        // 1. If the sender is the creator of the group, abort these steps
        if (senderIdentity === creatorIdentity) {
            this._log.warn('Discarding group leave message from group creator');
            return;
        }

        // 2. Look up the group
        const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);

        // 3. If the group could not be found or is marked as left:
        if (
            group === undefined ||
            group.get().view.userState === GroupUserState.KICKED ||
            group.get().view.userState === GroupUserState.LEFT
        ) {
            // (Delegate to subclass)
            await this._handleGroupLeaveForUnknownOrLeftGroup(handle);
            return;
        }

        // Ensure that the sender contact exists
        const senderContact = await this._handleMissingSenderContact(handle);

        // 4. Remove the member from the local group
        const removed = await this._removeMemberFromGroup(handle, senderContact, group);
        if (removed) {
            this._log.info(
                `Group member ${senderIdentity} left the group ${this._groupDebugString}`,
            );
        } else {
            this._log.info(
                `User ${senderIdentity} is not part of the group ${this._groupDebugString}. Leave message had no effect.`,
            );
        }
    }

    /**
     * Handle the case where we received a group leave message for an unknown group, or for a group
     * that we left.
     */
    protected abstract _handleGroupLeaveForUnknownOrLeftGroup(
        handle: TTaskCodecHandleType,
    ): Promise<void>;

    /**
     * Handle the case where the sender contact does not exist yet.
     */
    protected abstract _handleMissingSenderContact(
        handle: TTaskCodecHandleType,
    ): Promise<ModelStore<Contact>>;

    /**
     * Remove {@link memberUid} from {@link group}.
     *
     * Return whether or not the member was removed. (If the member was not part of the group, false
     * will be returned.)
     */
    protected abstract _removeMemberFromGroup(
        handle: TTaskCodecHandleType,
        member: ModelStore<Contact>,
        group: ModelStore<Group>,
    ): Promise<boolean>;
}
