import {AcquaintanceLevel, GroupUserState} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Contact, type ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {
    sendEmptyGroupSetup,
    sendGroupDeleteProfilePicture,
    sendGroupName,
    sendGroupSetProfilePicture,
    sendGroupSetup,
} from '~/common/network/protocol/task/common/group-helpers';
import {type GroupCreatorContainer} from '~/common/network/structbuf/validate/csp/e2e';
import {type IdentityString, type MessageId} from '~/common/network/types';

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
        private readonly _senderContactOrInit: LocalModelStore<Contact> | ContactInit,
        private readonly _container: GroupCreatorContainer.Type,
    ) {
        const messageIdHex = messageId.toString(16);
        this._log = _services.logging.logger(
            `network.protocol.task.in-group-sync-request.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof LocalModelStore) {
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
        const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);
        if (group === undefined) {
            this._log.info('Received group sync request for an unknown group. Discarding.');
            return;
        }
        const view = group.get().view;

        // Check the sender contact. If it wasn't stored in the database yet, do that now.
        let senderContact;
        if (this._senderContactOrInit instanceof LocalModelStore) {
            senderContact = this._senderContactOrInit;
        } else {
            this._log.debug('Received group sync request from unknown user. Adding user.');
            senderContact = await model.contacts.add.fromRemote(handle, {
                ...this._senderContactOrInit,
                acquaintanceLevel: AcquaintanceLevel.GROUP,
            });
        }

        // 2. If the group is marked as left or the sender is not a member of the group, send a
        //    group-setup with an empty members list back to the sender and abort these steps.
        if (view.userState !== GroupUserState.MEMBER) {
            this._log.info(
                'Received a group sync request for a group that we dissolved. Returning empty group setup message.',
            );
            await sendEmptyGroupSetup(groupId, senderContact.get(), handle, this._services);
            return;
        }
        if (!view.members.includes(senderIdentity)) {
            this._log.info(
                'Received a group sync request from a non-member. Returning empty group setup message.',
            );
            await sendEmptyGroupSetup(groupId, senderContact.get(), handle, this._services);
            return;
        }

        this._log.info(`Syncing group to member ${senderIdentity}`);

        // 3. Send a group-setup message with the current group members, followed by a group-name
        //    message to the sender.
        await sendGroupSetup(groupId, senderContact.get(), view.members, handle, this._services);
        await sendGroupName(groupId, senderContact.get(), view.name, handle, this._services);

        // 4. If the group has a profile picture, send a set-profile-picture group control message
        //    to the sender.
        // 5. If the group has no profile picture, send a delete-profile-picture group control message to the sender.
        const profilePictureView = group.get().controller.profilePicture.get().view;
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

        // Note: In theory we could send the group name and profile picture concurrently, but that
        //       makes testing harder. Thus, we send them sequentially.
    }
}
