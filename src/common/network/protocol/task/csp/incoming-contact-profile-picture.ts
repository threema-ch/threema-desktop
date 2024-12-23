import {extractErrorMessage} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {ModelStore} from '~/common/model/utils/model-store';
import {downloadAndDecryptBlob} from '~/common/network/protocol/blob';
import {BLOB_FILE_NONCE} from '~/common/network/protocol/constants';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {SetProfilePicture} from '~/common/network/structbuf/validate/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {assert, ensureError} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process incoming contact set/delete profile picture messages.
 */
export class IncomingContactProfilePictureTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: ModelStore<Contact> | ContactInit,
        private readonly _profilePicture: SetProfilePicture.Type | undefined,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.in-contact-profile-picture.${messageIdHex}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // This task will be called with "missingContactHandling: 'ignore'", so we can be sure that
        // the task will only be called if the sender contact already existed.
        assert(
            this._senderContactOrInit instanceof ModelStore,
            'Expected senderContactOrInit to be a model store',
        );
        const senderContact = this._senderContactOrInit;
        const senderIdentity = senderContact.get().view.identity;
        const action = this._profilePicture === undefined ? 'delete' : 'set';
        this._log.info(`Processing ${action} profile picture from ${senderIdentity}`);

        const source = 'contact-defined';
        const profilePictureController = senderContact
            .get()
            .controller.profilePicture.get().controller;

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
                    `Could not download and decrypt profile picture for contact ${senderIdentity}: ${extractErrorMessage(
                        ensureError(error),
                        'short',
                    )}`,
                );
                return;
            }

            // Store profile picture as contact-defined profile picture
            await profilePictureController.setPicture.fromRemote(
                handle,
                {
                    bytes: decryptedBlobBytes,
                    blobId: this._profilePicture.pictureBlobId,
                    blobKey: this._profilePicture.key,
                },
                source,
            );
            this._log.info(`Updated profile picture for contact ${senderIdentity}`);
        } else {
            // Delete contact-defined profile picture
            await profilePictureController.removePicture.fromRemote(handle, source);
            this._log.info(`Deleted profile picture for contact ${senderIdentity}`);
        }
    }
}
