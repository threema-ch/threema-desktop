import {CspE2eContactControlType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type Contact} from '~/common/model';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {CspMessageFlags} from '~/common/network/protocol/flags';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {OutgoingCspMessageTask} from '~/common/network/protocol/task/csp/outgoing-csp-message';
import {randomMessageId} from '~/common/network/protocol/utils';
import * as structbuf from '~/common/network/structbuf';
import {ensureError} from '~/common/utils/assert';

/**
 * Task to send an outgoing contact-request-profile-picture message sequentially to all specified
 * contacts.
 *
 * The task works on a best-effort basis. If sending the message to a certain contact fails for any
 * reason, then the error is logged and sending to the remaining contacts continues.
 */
export class OutgoingContactRequestProfilePictureTask implements ActiveTask<void, 'persistent'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _contacts: LocalModelStore<Contact>[],
        private readonly _throwOnFailure: boolean = false,
    ) {
        this._log = _services.logging.logger(
            `network.protocol.task.out-contact-request-profile-picture`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<undefined> {
        this._log.info(`Request profile picture from ${this._contacts.length} contacts`);
        for (const contact of this._contacts) {
            const subtask = new OutgoingCspMessageTask(this._services, contact.get(), {
                type: CspE2eContactControlType.CONTACT_REQUEST_PROFILE_PICTURE,
                encoder: structbuf.bridge.encoder(
                    structbuf.csp.e2e.ContactRequestProfilePicture,
                    {},
                ),
                cspMessageFlags: CspMessageFlags.none(),
                messageId: randomMessageId(this._services.crypto),
                createdAt: new Date(),
                allowUserProfileDistribution: false,
            });
            try {
                await subtask.run(handle);
            } catch (error) {
                const identity = contact.get().view.identity;
                this._log.warn(`Failed to request profile picture from ${identity}: ${error}`);
                if (this._throwOnFailure) {
                    throw ensureError(error);
                }
            }
        }
        return undefined;
    }
}
