import type {Logger} from '~/common/logging';
import {getIdentityString} from '~/common/model/contact';
import {groupDebugString} from '~/common/model/group';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {
    GroupCreatorContainer,
    SetProfilePicture,
} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process reflected incoming or outgoing group set/delete profile picture messages.
 */
export class ReflectedGroupProfilePictureTask
    implements ComposableTask<PassiveTaskCodecHandle, void>
{
    private readonly _log: Logger;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderIdentity: IdentityString,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _profilePicture: SetProfilePicture.Type | undefined,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-group-profile-picture.${messageIdHex}`,
        );
        this._groupDebugString = groupDebugString(_senderIdentity, _container.groupId);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;
        const action = this._profilePicture === undefined ? 'delete' : 'set';

        this._log.info(
            `Processing group ${action} profile picture from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;
        const creator = getIdentityString(this._services.device, creatorIdentity);

        // Look up group
        const group = model.groups.getByGroupIdAndCreator(groupId, creator);
        if (group === undefined) {
            this._log.error(
                `Abort processing of group ${action} profile picture message for unknown group`,
            );
            return;
        }

        const source = 'admin-defined';
        const profilePictureController = group.get().controller.profilePicture.get().controller;

        if (this._profilePicture !== undefined) {
            // Download profile picture bytes
            const decryptedBlobBytes = await downloadAndDecryptBlob(
                this._services,
                this._log,
                this._profilePicture.pictureBlobId,
                this._profilePicture.key,
                BLOB_FILE_NONCE,
                'public',
                'local',
            );

            // Set group profile picture
            profilePictureController.setPicture.fromSync(decryptedBlobBytes, source);
            this._log.info(`Group ${this._groupDebugString} profile picture updated`);
        } else {
            // Remove group profile picture
            profilePictureController.removePicture.fromSync(source);
            this._log.info(`Group ${this._groupDebugString} profile picture removed`);
        }
    }
}
