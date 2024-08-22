import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import type {
    GroupCreatorContainer,
    SetProfilePicture,
} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {ensureError} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process incoming group set/delete profile picture messages.
 */
export class IncomingGroupProfilePictureTask
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
        private readonly _profilePicture: SetProfilePicture.Type | undefined,
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
        const action = this._profilePicture === undefined ? 'delete' : 'set';
        this._log.info(
            `Processing group ${action} profile picture from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;

        // Run common group receive steps
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
        const group = receiveStepsResult.group;

        const source = 'admin-defined';
        const profilePictureController = group.get().controller.profilePicture.get().controller;

        if (this._profilePicture !== undefined) {
            // Download and decrypt public blob
            let decryptedBlobBytes;
            try {
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

            // Update group profile picture
            await profilePictureController.setPicture.fromRemote(
                handle,
                {
                    bytes: decryptedBlobBytes,
                    blobId: this._profilePicture.pictureBlobId,
                    blobKey: this._profilePicture.key,
                },
                source,
            );
            this._log.info(`Group ${this._groupDebugString} profile picture updated`);
        } else {
            await profilePictureController.removePicture.fromRemote(handle, source);
            this._log.info(`Group ${this._groupDebugString} profile picture removed`);
        }
    }
}
