/**
 * Incoming group leave task.
 */
import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {GroupMemberState, GroupUserState, TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    addGroupContacts,
    sendGroupSyncRequestSteps,
} from '~/common/network/protocol/task/common/group-helpers';
import {getD2dGroupSyncUpdate} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {assert, unwrap} from '~/common/utils/assert';
/**
 * Base class for handling CSP or D2D incoming group leave messages.
 */
export class IncomingGroupLeaveTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _senderIdentity: IdentityString;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        senderContactOrInit: ModelStore<Contact> | ContactInit,
        private readonly _container: GroupMemberContainer.Type,
        private readonly _createdAt: Date,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.incoming-group-leave.${messageIdHex}`,
        );
        if (senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(_container.creatorIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const {model} = this._services;

        this._log.info(
            `Processing incoming group leave from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const senderIdentity = this._senderIdentity;
        const creatorIdentity = this._container.creatorIdentity;
        const groupId = this._container.groupId;

        // 1. If the sender is the creator of the group, log a warning, discard the message and abort these steps.
        if (senderIdentity === creatorIdentity) {
            this._log.warn('Discarding group leave message from group creator');
            return;
        }

        // 2. Look up the group
        const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);

        // 3. If the group could not be found or is marked as left:
        if (group === undefined || group.get().view.userState !== GroupUserState.MEMBER) {
            // 3.1 If the user is the creator of the group (as alleged by the message), discard the
            if (creatorIdentity === this._services.device.identity.string) {
                return;
            }

            const creatorModel = await this._getCreatorModel(handle, creatorIdentity);
            if (creatorModel === undefined) {
                this._log.warn(
                    `Discarding group message with unknown creator (${creatorIdentity}) that cannot be added to the contacts`,
                );
                return;
            }

            // 3.2 Run the Group Sync Request Steps for the group, discard the message and abort
            // these steps.
            await sendGroupSyncRequestSteps(
                groupId,
                creatorModel,
                handle,
                this._services,
                this._log,
            );
            return;
        }

        // 5. If group.members does not include the sender, discard the message and abort these
        //    steps.
        const senderModel = [...group.get().view.members].find(
            (member) => senderIdentity === member.get().view.identity,
        );
        if (senderModel === undefined) {
            return;
        }

        // 6.1 Begin a transaction with scope GROUP_SYNC and the following precondition:
        const [transactionResult] = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            // 6.1.1 (Precondition) If the group does not exist or the group is marked as left, log
            // a warning that a group sync race occurred, discard the message and abort these steps.
            () => {
                const group_ = this._services.model.groups.getByGroupIdAndCreator(
                    groupId,
                    creatorIdentity,
                );
                return (
                    group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER
                );
            },
            async () => {
                // 6.2 Let group be a snapshot of the current group state.
                const currentGroupMembers_ = [...group.get().view.members].map(
                    (currentMember) => currentMember.get().view.identity,
                );
                // 6.3 If group.members does not include the sender, log a warning that a group sync
                // race occurred.
                if (!currentGroupMembers_.includes(senderIdentity)) {
                    this._log.warn('A group sync race occurred, the member left already.');
                }

                // 6.5. Remove the sender from updated-members.
                const updatedMembers = currentGroupMembers_.filter(
                    (memberIdentity) => memberIdentity !== senderIdentity,
                );

                // 6.6 Reflect a GroupSync.Update with member_state_changes set to the single entry
                // of the sender leaving and group set to contain member_identities set from
                // updated-members.
                await handle.reflect([
                    {
                        envelope: {
                            groupSync: getD2dGroupSyncUpdate(
                                {creatorIdentity, groupId},
                                undefined,
                                {
                                    removedIdentities: {
                                        removed: [senderIdentity],
                                        type: GroupMemberState.LEFT,
                                    },
                                    memberIdentities: updatedMembers,
                                },
                            ),
                            protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                        },
                        flags: D2mMessageFlags.none(),
                    },
                ]);
            },
        );

        // 6.7 Commit the transaction and await acknowledgement.

        // 6.1 If the group does not exist or the group is marked as left, log a warning that a
        // group sync race occurred, discard the message and abort these steps.
        if (!transactionCompleted(transactionResult)) {
            this._log.warn(
                'Transaction was aborted by precondition because a group sync race occurred, not persisting group leave changes to the database',
            );
            return;
        }

        // 7. If the user is currently participating in a group call of this group, remove the
        //    sender from the group call (handle it as if the sender left the call).

        // Nothing to do here, as the above step happens internally in the going group call.

        // 8. Remove the sender from the group.
        const removed = await group
            .get()
            .controller.removeMembers.fromRemote(handle, [senderModel], this._createdAt);

        if (removed === 1) {
            this._log.info(
                `Group member ${senderIdentity} left the group ${this._groupDebugString}`,
            );
        } else {
            this._log.debug(
                `User ${senderIdentity} is not part of the group ${this._groupDebugString}. Leave message had no effect.`,
            );
        }
    }

    // TODO(DESK-1566): The group creator should not be added as a contact when responding with a
    // group-sync-request! Instead, only necessary information to send a group-sync-request must be
    // returned but no contact should be created.
    private async _getCreatorModel(
        handle: ActiveTaskCodecHandle<'volatile'>,
        creatorIdentity: IdentityString,
    ): Promise<Contact | undefined> {
        let creatorModel = this._services.model.contacts.getByIdentity(creatorIdentity)?.get();
        if (creatorModel === undefined) {
            // Creator contact not found. Note: If group message is wrapped in
            // `group-creator-container`, this situation should never happen. If the message is
            // wrapped in `group-member-container`, then this could be possible.
            const addedContacts = await addGroupContacts(
                [creatorIdentity],
                handle,
                this._services,
                this._log,
            );
            if (addedContacts.length < 1) {
                return undefined;
            }
            assert(addedContacts.length === 1, 'addedContacts contained more than one contact');
            creatorModel = unwrap(addedContacts[0]).get();
        }
        return creatorModel;
    }
}
