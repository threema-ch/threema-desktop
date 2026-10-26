import {byteEquals} from '@threema/ts-utils/byte/byte-equals';
import {u64ToHexLe} from '@threema/ts-utils/conversion/u64-to-hex-le';
import {ensureError} from '@threema/ts-utils/meta/ensure-error';

import {GroupUserState, StatusMessageType, TransactionScope} from '~/common/enum';
import {extractErrorMessage} from '~/common/error';
import {ProfilePictureChange} from '~/common/internal-protobuf/status-message';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import * as protobuf from '~/common/network/protobuf';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {getD2dGroupSyncUpdate} from '~/common/network/protocol/task/d2d/group-sync-helper';
import {transactionCompleted} from '~/common/network/protocol/task/manager';
import type {
    GroupCreatorContainer,
    SetProfilePicture,
} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';

/**
 * Receive and process incoming group set profile picture messages.
 */
export class IncomingSetGroupProfilePictureTask
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
        private readonly _profilePicture: SetProfilePicture.Type,
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
            `Processing group set profile picture from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;

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

        const source = 'admin-defined';

        let decryptedBlobBytes;
        try {
            // 2. (Profile Picture Set) Download the picture from the blob server but do not request the blob to be
            //    removed. Let profile-picture be the result.
            decryptedBlobBytes = await downloadAndDecryptBlob(
                this._services,
                this._log,
                this._profilePicture.pictureBlobId,
                this._profilePicture.key,
                BLOB_FILE_NONCE,
                'public',
                'local',
            );
        } catch (error) {
            this._log.warn(
                `Could not download and decrypt profile picture for group ${
                    this._groupDebugString
                }: ${extractErrorMessage(ensureError(error), 'short')}`,
            );
            return;
        }

        // 3. Let group be a snapshot of the current group state.
        const group = receiveStepsResult.group;
        const profilePictureController = group.get().controller.profilePicture.get().controller;
        const currentProfilePicture = group.get().controller.profilePicture.get().view.picture;

        // 4. If group.profile-picture is defined and equals profile-picture (i.e. no change),
        //    discard the message and abort these steps.
        if (
            currentProfilePicture !== undefined &&
            byteEquals(decryptedBlobBytes, currentProfilePicture)
        ) {
            return;
        }

        // 5.1 (MD) Begin a transaction with scope GROUP_SYNC
        const [transactionResult] = await handle.transaction(
            TransactionScope.GROUP_SYNC,
            // 5.1.1 (Precondition) If the group does not exist or the group is marked as left, log
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
                // 5.2 (MD) Let group be a snapshot of the current group state.
                const currentProfilePicture_ = group.get().controller.profilePicture.get()
                    .view.picture;

                // 5.3 (MD) If group.profile-picture is defined and equals profile-picture, log a
                // warning that a group sync race occurred.
                if (
                    currentProfilePicture_ !== undefined &&
                    byteEquals(decryptedBlobBytes, currentProfilePicture_)
                ) {
                    this._log.warn(
                        'A group sync race occurred, the profile picture was already set.',
                    );
                }

                // 5.4 (MD) Reflect a GroupSync.Update with group set to contain profile_picture set
                // to `profile-picture.
                await handle.reflect([
                    {
                        envelope: {
                            groupSync: getD2dGroupSyncUpdate(
                                {creatorIdentity, groupId},
                                undefined,
                                undefined,
                                {
                                    type: 'set',
                                    blob: {
                                        blobId: this._profilePicture.pictureBlobId,
                                        key: this._profilePicture.key,
                                        nonce: BLOB_FILE_NONCE,
                                        uploadedAt: new Date(),
                                    },
                                },
                            ),
                            protocolVersion: protobuf.d2d.ProtocolVersion.V0_2,
                        },
                        flags: D2mMessageFlags.none(),
                    },
                ]);
            },
        );

        // 5.5 (MD) Commit the transaction and await acknowledgement.

        // 5.1.1 (Precondition failed) If the group does not exist or the group is marked as left, log a warning that a
        // group sync race occurred, discard the message and abort these steps.
        if (!transactionCompleted(transactionResult)) {
            this._log.warn(
                'Transaction was aborted by precondition because a group sync race occurred. Not persisting profile picture changes.',
            );
            return;
        }

        // 6. Store the profile picture and and apply it to the group.
        await profilePictureController.setPicture.fromRemote(
            handle,
            {
                blobId: this._profilePicture.pictureBlobId,
                blobKey: this._profilePicture.key,
                bytes: decryptedBlobBytes,
            },
            source,
        );

        group
            .get()
            .controller.conversation()
            .get()
            .controller.createStatusMessage({
                type: StatusMessageType.GROUP_PROFILE_PICTURE_CHANGED,
                value: {
                    change: ProfilePictureChange.SET,
                },
                createdAt: new Date(),
            });

        this._log.info(`Group ${this._groupDebugString} profile picture updated`);
    }
}
