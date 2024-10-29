import {AcquaintanceLevel, GroupUserState} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    sendEmptyGroupSetup,
    sendGroupDeleteProfilePicture,
    sendGroupName,
    sendGroupSetProfilePicture,
    sendGroupSetup,
} from '~/common/network/protocol/task/common/group-helpers';
import {createOutgoingCspGroupCallStartTask} from '~/common/network/protocol/task/csp/outgoing-group-call-start';
import type {GroupCreatorContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process incoming group sync request messages.
 */
export class IncomingGroupSyncRequestTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;
    private readonly _senderIdentity: IdentityString;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: ModelStore<Contact> | ContactInit,
        private readonly _container: GroupCreatorContainer.Type,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.in-group-sync-request.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(this._senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const {device, model} = this._services;

        this._log.info(
            `Processing group sync request from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const senderIdentity = this._senderIdentity;
        const creatorIdentity = device.identity.string;
        const groupId = this._container.groupId;

        // 1. Look up the group. If the group could not be found, abort these steps.
        const group = model.groups.getByGroupIdAndCreator(
            groupId,
            this._services.device.identity.string,
        );
        if (group === undefined) {
            this._log.info('Received group sync request for an unknown group. Discarding.');
            return;
        }
        const {view, controller} = group.get();

        // Check the sender contact. If it wasn't stored in the database yet, do that now.
        let senderContact;
        if (this._senderContactOrInit instanceof ModelStore) {
            senderContact = this._senderContactOrInit;
        } else {
            this._log.debug('Received group sync request from unknown user. Adding user.');
            senderContact = await model.contacts.add.fromRemote(handle, {
                ...this._senderContactOrInit,
                acquaintanceLevel: AcquaintanceLevel.GROUP_OR_DELETED,
            });
        }

        // 2. If the last group-sync-request from the sender for this particular group (uniquely
        //    identified by group id and creator) is less than 1h ago, log a notice, discard the
        //    message and abort these steps.
        const groupSyncTimestamp = new Date();
        const lastGroupSyncTimestamp =
            this._services.volatileProtocolState.getLastProcessedGroupSyncRequest(
                view.groupId,
                creatorIdentity,
                senderIdentity,
            );
        if (lastGroupSyncTimestamp !== undefined) {
            this._log.info(
                'Received a group sync request before the timer allows a new one. Discarding the message.',
            );
            return;
        }

        // The timer has ran out, we can now update it and handle the group sync request normally.
        this._services.volatileProtocolState.setLastProcessedGroupSyncRequest(
            view.groupId,
            creatorIdentity,
            senderIdentity,
            groupSyncTimestamp,
        );

        const memberIdentities = [...view.members].map((member) => member.get().view.identity);

        // 3. If the group is marked as left or the sender is not a member of the group, send a
        //    group-setup with an empty members list back to the sender and abort these steps.
        if (view.userState !== GroupUserState.MEMBER) {
            this._log.info(
                'Received a group sync request for a group that we dissolved. Returning empty group setup message.',
            );
            await sendEmptyGroupSetup(groupId, senderContact.get(), handle, this._services);
            return;
        }
        if (!memberIdentities.includes(senderIdentity)) {
            this._log.info(
                'Received a group sync request from a non-member. Returning empty group setup message.',
            );
            await sendEmptyGroupSetup(groupId, senderContact.get(), handle, this._services);
            return;
        }

        this._log.info(`Syncing group to member ${senderIdentity}`);

        // 4. Send a group-setup message with the current group members, followed by a group-name
        //    message to the sender.
        await sendGroupSetup(
            groupId,
            senderContact.get(),
            memberIdentities,
            handle,
            this._services,
        );
        await sendGroupName(groupId, senderContact.get(), view.name, handle, this._services);

        // 5. If the group has a profile picture, send a set-profile-picture group control message
        //    to the sender.
        // 6. If the group has no profile picture, send a delete-profile-picture group control message to the sender.
        const profilePictureView = controller.profilePicture.get().view;
        if (profilePictureView.picture !== undefined) {
            await sendGroupSetProfilePicture(
                groupId,
                senderContact.get(),
                profilePictureView.picture,
                handle,
                this._services,
            );
        } else {
            await sendGroupDeleteProfilePicture(
                groupId,
                senderContact.get(),
                handle,
                this._services,
            );
        }

        // 6. If a group call is currently considered running within this group, run the _Group Call
        //    Refresh Steps_ and let `chosen-call` be the result. If `chosen-call` is defined,
        //    repeat `csp-e2e.GroupCallStart` that is associated to `chosen-call` with the _created_
        //    timestamp set to the `started_at` value associated to `chosen-call`.
        {
            const chosen = await controller.refreshCall(undefined);
            if (chosen !== undefined) {
                await createOutgoingCspGroupCallStartTask(
                    this._services,
                    group.get(),
                    chosen.base,
                ).run(handle);
            }
        }
    }
}
