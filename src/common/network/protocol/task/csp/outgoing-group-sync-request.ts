import {type Logger} from '~/common/logging';
import {type Group} from '~/common/model';
import {groupDebugString} from '~/common/model/group';
import {type LocalModelStore} from '~/common/model/utils/model-store';
import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type ActiveTaskSymbol,
    type ServicesForTasks,
} from '~/common/network/protocol/task';
import {sendGroupSyncRequest} from '~/common/network/protocol/task/common/group-helpers';
import {unwrap} from '~/common/utils/assert';
import {u64ToHexLe} from '~/common/utils/number';

/**
 * Task to send an outgoing group-sync-request message sequentially to all specified groups.
 *
 * The task works on a best-effort basis. If sending the message to a group fails for any reason,
 * then the error is logged and sending to the remaining groups continues.
 */
export class OutgoingGroupSyncRequestTask implements ActiveTask<void, 'persistent'> {
    public readonly type: ActiveTaskSymbol = ACTIVE_TASK;
    public readonly persist = true;
    public readonly transaction = undefined;

    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForTasks,
        private readonly _groups: LocalModelStore<Group>[],
    ) {
        this._log = _services.logging.logger(`network.protocol.task.out-group-sync-request`);
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<undefined> {
        const {model} = this._services;

        this._log.info(`Request sync from ${this._groups.length} groups`);
        for (const group of this._groups) {
            const view = group.get().view;

            // Ensure we're not the creator
            if (view.creatorIdentity === model.user.identity) {
                this._log.error(
                    `Skipping group with ID ${u64ToHexLe(view.groupId)}, since we're the creator`,
                );
                continue;
            }

            // Look up creator contact
            const creator = unwrap(
                model.contacts.getByIdentity(view.creatorIdentity),
                `Group creator with identity ${view.creatorIdentity} not found`,
            );

            // Send sync request to creator
            try {
                await sendGroupSyncRequest(
                    view.groupId,
                    view.creatorIdentity,
                    creator.get(),
                    handle,
                    this._services,
                );
            } catch (error) {
                const debugString = groupDebugString(view.creatorIdentity, view.groupId);
                this._log.warn(`Failed to request group sync for group ${debugString}: ${error}`);
            }
        }
        return undefined;
    }
}
