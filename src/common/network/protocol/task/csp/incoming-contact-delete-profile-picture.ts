import {type Logger} from '~/common/logging';
import {type Contact, type ContactInit} from '~/common/model';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {type MessageId} from '~/common/network/types';
import {assert} from '~/common/utils/assert';

/**
 * Receive and process incoming contact delete profile picture messages.
 */
export class IncomingContactDeleteProfilePictureTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;

    public constructor(
        services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderContactOrInit: LocalModelStore<Contact> | ContactInit,
    ) {
        const messageIdHex = messageId.toString(16);
        this._log = services.logging.logger(
            `network.protocol.task.in-contact-delete-profile-picture.${messageIdHex}`,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        // This task will be called with "missingContactHandling: 'ignore'", so we can be sure that
        // the task will only be called if the sender contact already existed.
        assert(
            this._senderContactOrInit instanceof LocalModelStore,
            'Expected senderContactOrInit to be a model store',
        );
        const senderContact = this._senderContactOrInit;
        const senderIdentity = senderContact.get().view.identity;

        this._log.debug(`Processing deleted profile picture from ${senderIdentity}`);

        // Delete contact-defined profile picture
        const profilePicture = senderContact.get().controller.profilePicture();
        profilePicture.get().controller.setPicture(undefined, 'contact-defined');

        this._log.info(`Deleted profile picture for contact ${senderIdentity}`);
    }
}
