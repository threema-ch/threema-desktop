import {GroupUserState} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {groupDebugString} from '~/common/model/group';
import type {
    ComposableTask,
    PassiveTaskCodecHandle,
    ServicesForTasks,
} from '~/common/network/protocol/task';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';
import type {MessageId} from '~/common/network/types';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Receive and process reflected outgoing group leave messages.
 *
 * Processing will not trigger side effects (e.g. reflection).
 */
export class ReflectedOutgoingGroupLeaveTask
    implements ComposableTask<PassiveTaskCodecHandle, void>
{
    private readonly _log: Logger;
    private readonly _groupDebugString: string;

    public constructor(
        private readonly _services: ServicesForTasks,
        messageId: MessageId,
        private readonly _container: GroupMemberContainer.Type,
    ) {
        const messageIdHex = u64ToHexLe(messageId);
        this._log = _services.logging.logger(
            `network.protocol.task.reflected-out-group-leave.${messageIdHex}`,
        );
        this._groupDebugString = groupDebugString(
            _services.device.identity.string,
            _container.groupId,
        );
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async run(handle: PassiveTaskCodecHandle): Promise<void> {
        const {device, model} = this._services;

        this._log.info(
            `Processing reflected outgoing group leave for group ${this._groupDebugString}`,
        );

        // Look up the group
        const group = model.groups.getByGroupIdAndCreator(
            this._container.groupId,
            this._container.creatorIdentity,
        );

        // If the group could not be found or is marked as left (i.e. was dissolved): Log warning
        // and exit.
        if (group === undefined) {
            this._log.error(
                `Received reflected outgoing group leave message for unknown group. Discarding.`,
            );
            return;
        }
        if (
            group.get().view.userState === GroupUserState.KICKED ||
            group.get().view.userState === GroupUserState.LEFT
        ) {
            this._log.error(
                `Received reflected outgoing group leave message for dissolved group. Discarding.`,
            );
            return;
        }

        // If we're the creator of this group, dissolve the group.
        // Otherwise, leave it.
        if (this._container.creatorIdentity === device.identity.string) {
            group.get().controller.dissolve.fromSync();
            this._log.info(`We dissolved the group ${this._groupDebugString}`);
        } else {
            // Otherwise, process the leave message and leave the group
            group.get().controller.leave.fromSync();
            this._log.info(`We left the group ${this._groupDebugString}`);
        }
    }
}
