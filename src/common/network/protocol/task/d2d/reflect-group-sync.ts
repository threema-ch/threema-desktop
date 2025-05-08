import type {TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {groupDebugString} from '~/common/model/group';
import type {ConversationUpdateFromToSync} from '~/common/model/types/conversation';
import type {Group, GroupUpdate} from '~/common/model/types/group';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
    TransactionRunning,
} from '~/common/network/protocol/task';
import {getD2dGroupSyncUpdate} from '~/common/network/protocol/task/d2d/group-sync-helper';
import type {GroupId, IdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';

interface GroupSyncUpdate {
    readonly type: 'update';
    readonly creatorIdentity: IdentityString;
    readonly groupId: GroupId;
    readonly group: Pick<
        GroupUpdate,
        'notificationSoundPolicyOverride' | 'notificationTriggerPolicyOverride'
    >;
    readonly conversation: ConversationUpdateFromToSync;
}

export type GroupSyncVariant = GroupSyncUpdate;

/**
 * Reflect group update to other devices in the device group.
 *
 * (Creation and deletion is not currently supported via D2D group sync protocol.)
 *
 * This task can only be called when a transaction is already running.
 */
export class ReflectGroupSyncTask
    implements ComposableTask<ActiveTaskCodecHandle<'volatile'>, void>
{
    private readonly _log: Logger;

    public constructor(
        services: ServicesForTasks,
        transaction: TransactionRunning<TransactionScope.GROUP_SYNC>, // Ensures transaction is running
        private readonly _group: Group,
        private readonly _variant: GroupSyncVariant,
    ) {
        const groupString = groupDebugString(_variant.creatorIdentity, _variant.groupId);
        this._log = services.logging.logger(
            `network.protocol.task.reflect-group-sync.${groupString}`,
        );
    }

    public async run(handle: ActiveTaskCodecHandle<'volatile'>): Promise<void> {
        const variant = this._variant;

        // Determine group sync message and send it
        let groupSync;

        const conversation = this._group.controller.conversation();
        switch (variant.type) {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            case 'update':
                groupSync = getD2dGroupSyncUpdate(
                    {
                        creatorIdentity: variant.creatorIdentity,
                        groupId: variant.groupId,
                    },
                    undefined,
                    undefined,
                    undefined,
                    {view: conversation.get().view, update: variant.conversation},
                );
                break;
            default:
                unreachable(variant.type);
        }
        this._log.info(`Syncing group '${variant.type}' to other devices`);
        await handle.reflect([{envelope: {groupSync}, flags: D2mMessageFlags.none()}]);
    }
}
