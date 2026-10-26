import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';

import {GroupUserState, StatusMessageType, TransactionScope} from '~/common/enum';
import {ProfilePictureChange} from '~/common/internal-protobuf/status-message';
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
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {getD2dGroupSyncUpdate} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import type {GroupCreatorContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
/**
 * Receive and process incoming group delete profile picture messages.
 */
export class IncomingDeleteGroupProfilePictureTask
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
            `network.protocol.task.in-group-profile-picture.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(this._senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        this._log.info(
            `Processing group delete profile picture from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;
        const source = 'admin-defined';

        // 1. Run the Common Group Receive Steps. If the message has been discarded, abort these steps.
        const receiveStepsResult = await commonGroupReceiveSteps(
            groupId,
            creatorIdentity,
            this._senderContactOrInit,
            handle,
            this._services,
            this._log,
        );
        if (receiveStepsResult === undefined) {
            this._log.debug(
                'Aborting processing of group message after common group receive steps.',
            );
            return;
        }

        // 2. Let group be a snapshot of the current group state.
        const group = receiveStepsResult.group;
        const currentProfilePicture = group.get().controller.profilePicture.get().view.picture;
        const profilePictureController = group.get().controller.profilePicture.get().controller;

        // 3. If group.profile-picture is not defined (i.e. no change), discard the message and abort
        // these steps.
        if (currentProfilePicture === undefined) {
            return;
        }

        // 4.1 (MD) Begin a transaction with scope GROUP_SYNC
        const [transactionResult] = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            () => {
                // 4.1.1 (Precondition) If the group does not exist or the group is marked as left,
                // log a warning that a group sync race occurred, discard the message and abort
                // these steps.
                const group_ = this._services.model.groups.getByGroupIdAndCreator(
                    groupId,
                    creatorIdentity,
                );
                return (
                    group_ !== undefined && group_.get().view.userState === GroupUserState.MEMBER
                );
            },
            async () => {
                // 4.2 (MD) Let group be a snapshot of the current group state.
                const currentProfilePicture_ = group.get().controller.profilePicture.get()
                    .view.picture;

                // 4.3 If group.profile-picture is not defined, log a warning that a group sync race
                // occurred.
                if (currentProfilePicture_ === undefined) {
                    this._log.warn(
                        'A group sync race occurred, the profile picture was already removed.',
                    );
                }

                // 4.4 (MD) Reflect a GroupSync.Update with group set to contain profile_picture set
                // to `profile-picture.
                await handle.reflect([
                    {
                        envelope: {
                            groupSync: getD2dGroupSyncUpdate(
                                {creatorIdentity, groupId},
                                undefined,
                                undefined,
                                {
                                    type: 'removed',
                                },
                            ),
                            protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                        },
                        flags: D2mMessageFlags.none(),
                    },
                ]);
            },
        );

        // 4.5 Commit the transaction and await acknowledgement.

        // 4.1.1 (Precondition failed) If the group does not exist or the group is marked as left, log a warning that a
        // group sync race occurred, discard the message and abort these steps.
        if (!transactionCompleted(transactionResult)) {
            this._log.warn(
                'Transaction was aborted by precondition because a group sync race ocurred. Not persisting profile picture changes.',
            );
            return;
        }

        // 5. Remove the profile picture of the group.
        await profilePictureController.removePicture.fromRemote(handle, source);

        group
            .get()
            .controller.conversation()
            .get()
            .controller.createStatusMessage({
                type: StatusMessageType.GROUP_PROFILE_PICTURE_CHANGED,
                value: {
                    change: ProfilePictureChange.REMOVED,
                },
                createdAt: new Date(),
            });

        this._log.info(`Group ${this._groupDebugString} profile picture updated`);
    }
}
