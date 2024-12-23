/**
 * Incoming group name task.
 */
import type {Logger} from '~/common/logging';
import type {Contact, ContactInit} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {ModelStore} from '~/common/model/utils/model-store';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import {commonGroupReceiveSteps} from '~/common/network/protocol/task/common/group-helpers';
import type {GroupCreatorContainer, GroupName} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process incoming group name messages.
 */
export class IncomingGroupNameTask
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
        private readonly _groupName: GroupName.Type,
        private readonly _createdAt: Date,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(`network.protocol.task.in-group-name.${messageIdHex}`);
        if (_senderContactOrInit instanceof ModelStore) {
            this._senderIdentity = _senderContactOrInit.get().view.identity;
        } else {
            this._senderIdentity = _senderContactOrInit.identity;
        }
        this._groupDebugString = groupDebugString(this._senderIdentity, _container.groupId);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        this._log.info(
            `Processing group name from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;
        const groupName = this._groupName.name;

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

        // Update group name
        await group.get().controller.name.fromRemote(handle, groupName, this._createdAt);
        this._log.info(`Group ${this._groupDebugString} name updated to "${groupName}"`);
    }
}
