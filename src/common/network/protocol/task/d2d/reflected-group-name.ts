import type {Logger} from '~/common/logging';
import {groupDebugString} from '~/common/model/group';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {GroupCreatorContainer, GroupName} from '~/common/network/structbuf/validate/csp/e2e';
import type {IdentityString, MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process reflected incoming or outgoing group name messages.
 */
export class ReflectedGroupNameTask implements ComposableTask<PassiveTaskCodecHandle, void> {
    private readonly _log: Logger;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _senderIdentity: IdentityString,
        private readonly _container: GroupCreatorContainer.Type,
        private readonly _groupName: GroupName.Type,
        private readonly _reflectedAt: Date,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-group-name.${messageIdHex}`,
        );
        this._groupDebugString = groupDebugString(_senderIdentity, _container.groupId);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {model} = this._services;

        this._log.info(
            `Processing group name from ${this._senderIdentity} for group ${this._groupDebugString}`,
        );

        // Extract relevant fields
        const creatorIdentity = this._senderIdentity;
        const groupId = this._container.groupId;
        const groupName = this._groupName.name;

        // Look up group
        const group = model.groups.getByGroupIdAndCreator(groupId, creatorIdentity);
        if (group === undefined) {
            this._log.debug(`Abort processing of group name message for unknown group`);
            return;
        }

        // Update group name
        group.get().controller.name.fromSync(handle, groupName, this._reflectedAt);
        this._log.info(`Group ${this._groupDebugString} name updated to "${groupName}"`);
    }
}
