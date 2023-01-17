import {type EncryptedData, ensureNonce, NONCE_UNGUARDED_TOKEN} from '~/common/crypto';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import {extractErrorMessage} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type Contact, type ContactInit} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {type SetProfilePicture} from '~/common/network/structbuf/validate/csp/e2e';
import {type MessageId} from '~/common/network/types';
import {assert, ensureError} from '~/common/utils/assert';

const NONCE = ensureNonce(
    // prettier-ignore
    new Uint8Array([
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 1,
    ]),
);

/**
 * Receive and process incoming contact set profile picture messages.
 */
export class IncomingContactSetProfilePictureTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: LocalModelStore<Contact> | ContactInit,
        private readonly _message: SetProfilePicture.Type,
    ) {
        const messageIdHex = messageId.toString(16);
        this._log = _services.logging.logger(
            `network.protocol.task.in-contact-set-profile-picture.${messageIdHex}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const {blob, crypto} = this._services;

        // This task will be called with "missingContactHandling: 'ignore'", so we can be sure that
        // the task will only be called if the sender contact already existed.
        assert(
            this._senderContactOrInit instanceof LocalModelStore,
            'Expected senderContactOrInit to be a model store',
        );
        const senderContact = this._senderContactOrInit;
        const senderIdentity = senderContact.get().view.identity;

        this._log.debug(`Processing profile picture from ${senderIdentity}`);

        // Download blob
        // Note: Do not mark blob as done!
        let result;
        try {
            result = await blob.download('public', this._message.pictureBlobId);
        } catch (error) {
            this._log.warn(
                `Could not download profile picture for contact ${senderIdentity}: ${extractErrorMessage(
                    ensureError(error),
                    'short',
                )}`,
            );
            return;
        }
        const blobBytes = result.data;

        // Decrypt blob bytes
        const box = crypto.getSecretBox(this._message.key, NONCE_UNGUARDED_TOKEN);
        const decrypted = box
            .decryptorWithNonce(CREATE_BUFFER_TOKEN, NONCE, blobBytes as EncryptedData)
            .decrypt();

        // Store profile picture as contact-defined profile picture
        const profilePicture = senderContact.get().controller.profilePicture();
        profilePicture.get().controller.setPicture(decrypted, 'contact-defined');

        this._log.info(`Updated profile picture for contact ${senderIdentity}`);
    }
}
