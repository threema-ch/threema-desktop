import type {TransactionScope} from '~/common/enum';
import type {Logger} from '~/common/logging';
import {groupDebugString} from '~/common/model/group';
import type {ConversationUpdateFromToSync} from '~/common/model/types/conversation';
import type {GroupUpdateFromToSync} from '~/common/model/types/group';
import * as protobuf from '~/common/network/protobuf';
import {D2mMessageFlags} from '~/common/network/protocol/flags';
import type {
    ActiveTaskCodecHandle,
    ComposableTask,
    ServicesForTasks,
    TransactionRunning,
} from '~/common/network/protocol/task';
import type {GroupId, IdentityString} from '~/common/network/types';
import {unreachable} from '~/common/utils/assert';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';
import {hasPropertyStrict} from '~/common/utils/object';

const DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Group.NotificationTriggerPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

const DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Group.NotificationSoundPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);

function getD2dGroupSyncUpdate(
    groupIdentity: protobuf.common.GroupIdentity,
    groupUpdate: GroupUpdateFromToSync,
    conversationUpdate: ConversationUpdateFromToSync,
): protobuf.d2d.GroupSync {
    // Prepare notification trigger policy override
    let notificationTriggerPolicyOverride;
    if (hasPropertyStrict(groupUpdate, 'notificationTriggerPolicyOverride')) {
        if (groupUpdate.notificationTriggerPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationTriggerPolicyOverride = DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE;
        } else {
            // Specific policy
            let expiresAt;
            if (groupUpdate.notificationTriggerPolicyOverride.expiresAt !== undefined) {
                expiresAt = intoUnsignedLong(
                    dateToUnixTimestampMs(groupUpdate.notificationTriggerPolicyOverride.expiresAt),
                );
            }
            notificationTriggerPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Group.NotificationTriggerPolicyOverride,
                {
                    default: undefined,
                    policy: protobuf.utils.creator(
                        protobuf.sync.Group.NotificationTriggerPolicyOverride.Policy,
                        {
                            policy: groupUpdate.notificationTriggerPolicyOverride.policy,
                            expiresAt,
                        },
                    ),
                },
            );
        }
    }

    // Prepare notification sound policy override
    let notificationSoundPolicyOverride;
    if (hasPropertyStrict(groupUpdate, 'notificationSoundPolicyOverride')) {
        if (groupUpdate.notificationSoundPolicyOverride === undefined) {
            // Reset to undefined -> Default
            notificationSoundPolicyOverride = DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE;
        } else {
            notificationSoundPolicyOverride = protobuf.utils.creator(
                protobuf.sync.Group.NotificationSoundPolicyOverride,
                {
                    default: undefined,
                    policy: groupUpdate.notificationSoundPolicyOverride,
                },
            );
        }
    }

    return protobuf.utils.creator(protobuf.d2d.GroupSync, {
        create: undefined,
        update: protobuf.utils.creator(protobuf.d2d.GroupSync.Update, {
            group: protobuf.utils.creator(protobuf.sync.Group, {
                groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, groupIdentity),
                name: undefined,
                createdAt: undefined,
                userState: undefined,
                notificationTriggerPolicyOverride,
                notificationSoundPolicyOverride,
                profilePicture: undefined,
                memberIdentities: undefined,
                conversationCategory: conversationUpdate.category,
                conversationVisibility: conversationUpdate.visibility,
            }),
        }),
        delete: undefined,
    });
}

interface GroupSyncUpdate {
    readonly type: 'update';
    readonly creatorIdentity: IdentityString;
    readonly groupId: GroupId;
    readonly group: GroupUpdateFromToSync;
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
        switch (variant.type) {
            case 'update':
                groupSync = getD2dGroupSyncUpdate(
                    {
                        creatorIdentity: variant.creatorIdentity,
                        groupId: intoUnsignedLong(variant.groupId),
                    },
                    variant.group,
                    variant.conversation,
                );
                break;
            default:
                unreachable(variant.type);
        }
        this._log.info(`Syncing group '${variant.type}' to other devices`);
        await handle.reflect([{envelope: {groupSync}, flags: D2mMessageFlags.none()}]);
    }
}
