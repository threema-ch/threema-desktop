import {type Logger} from '~/common/logging';
import {type Contact, type ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {LocalModelStore} from '~/common/model/utils/model-store';
import {
    type ActiveTaskCodecHandle,
    type ComposableTask,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import {type GroupCreatorContainer} from '~/common/network/structbuf/validate/csp/e2e';
import {type IdentityString, type MessageId} from '~/common/network/types';

/**
 * Receive and process incoming group delete profile picture messages.
 */
export class IncomingGroupDeleteProfilePictureTask
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
            `network.protocol.task.in-group-set-profile-picture.${messageIdHex}`,
        );
        if (_senderContactOrInit instanceof LocalModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(this._senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        this._log.debug(
            `Processing deleted group profile picture from ${this._senderIdentity} for group ${this._groupDebugString}`,
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

        // Remove group profile picture
        const profilePicture = group.get().controller.profilePicture();
        await profilePicture.get().controller.removePicture.fromRemote(handle, 'admin-defined');
        this._log.info(`Group ${this._groupDebugString} profile picture removed`);
    }
}
