import type {ProtobufMessage} from '@threema/protocol/protobuf/tag';
import {tag, type WeakOpaque} from '@threema/ts-utils/meta/newtype';
import {dateToUnixTimestampMs} from '@threema/ts-utils/number/date-to-unix-timestamp-ms';
import {u64ToUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';

import {
    ConversationCategory,
    ConversationVisibility,
    type GroupNotificationTriggerPolicy,
    type GroupUserState,
} from '~/common/enum';
import type {GroupUpdate, GroupView} from '~/common/model';
import type {
    ConversationUpdateFromToSync,
    ConversationView,
} from '~/common/model/types/conversation';
import * as protobuf from '~/common/network/protobuf';
import {
    getDeltaImageMessage,
    type D2dProfilePictureUpdate,
    type D2dSetProfilePicture,
} from '~/common/network/protocol/task/d2d';
import type {GroupId, IdentityString} from '~/common/network/types';

// Return types for the helper functions to be compatible when creating protobuf messages.
type MemberStateChanges = WeakOpaque<
    Record<string, protobuf.d2d.GroupSync.Update.MemberStateChange>,
    ProtobufMessage
>;
export type DeltaImage = WeakOpaque<protobuf.common.DeltaImage, ProtobufMessage>;
type NotificationTriggerPolicyOverride = WeakOpaque<
    protobuf.d2d_sync.Group.NotificationTriggerPolicyOverride,
    ProtobufMessage
>;

// Policy defaults
const DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.d2d_sync.Group.NotificationTriggerPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
        policy: undefined,
    },
);
const DEFAULT_DEPRECATED_NOTIFICATION_SOUND_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.d2d_sync.Group.DeprecatedNotificationSoundPolicyOverride,
    {
        default: protobuf.UNIT_MESSAGE,
    },
);

/**
 * Construct a {@link protobuf.d2d.GroupSync} message with inner type
 * {@link protobuf.d2d.GroupSync.Create}
 *
 * This message only reflects the necessary information for creating a group. For other changes to
 * the group, use {@link getD2dGroupSyncUpdate}.
 */
export function getD2dGroupSyncCreate(
    groupIdentity: {readonly creatorIdentity: IdentityString; readonly groupId: GroupId},
    createdAt: Date,
    memberIdentities: readonly IdentityString[],
    name: string,
    userState: GroupUserState,
    profilePicture?: D2dSetProfilePicture,
): protobuf.d2d.GroupSync {
    return protobuf.utils.creator(protobuf.d2d.GroupSync, {
        create: protobuf.utils.creator(protobuf.d2d.GroupSync.Create, {
            group: protobuf.utils.creator(protobuf.d2d_sync.Group, {
                groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                    creatorIdentity: groupIdentity.creatorIdentity,
                    groupId: u64ToUnsignedLong(groupIdentity.groupId),
                }),
                name,
                createdAt: u64ToUnsignedLong(dateToUnixTimestampMs(createdAt)),
                userState,
                profilePicture: getDeltaImageMessage(profilePicture),
                memberIdentities: protobuf.utils.creator(protobuf.common.Identities, {
                    identities: memberIdentities,
                }),
                notificationTriggerPolicyOverride: DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE,
                deprecatedNotificationSoundPolicyOverride:
                    DEFAULT_DEPRECATED_NOTIFICATION_SOUND_POLICY_OVERRIDE,
                conversationCategory: ConversationCategory.DEFAULT,
                conversationVisibility: ConversationVisibility.SHOW,
            }),
        }),
        update: undefined,
        delete: undefined,
    });
}

/**
 * Construct a {@link protobuf.d2d.GroupSync} message with inner type
 * {@link protobuf.d2d.GroupSync.Delete}.
 */
export function getD2dGroupSyncDelete(groupIdentity: {
    readonly creatorIdentity: IdentityString;
    readonly groupId: GroupId;
}): protobuf.d2d.GroupSync {
    return protobuf.utils.creator(protobuf.d2d.GroupSync, {
        delete: protobuf.utils.creator(protobuf.d2d.GroupSync.Delete, {
            groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                creatorIdentity: groupIdentity.creatorIdentity,
                groupId: u64ToUnsignedLong(groupIdentity.groupId),
            }),
        }),
        create: undefined,
        update: undefined,
    });
}

/**
 * Construct a {@link protobuf.d2d.GroupSync} message with inner type
 * {@link protobuf.d2d.GroupSync.Update}
 *
 * @param groupIdentity The identity of the group to be updated.
 * @param groupUpdate The current view of the group and the fields to be updated.
 * @param groupMemberChanges The member list to be reflected. Contains an additional hint for the
 *   receiver side to know which contacts were added/removed and whether removal happend through
 *   kicking or through leaving.
 * @param profilePicture The updated {@link D2dProfilePictureUpdate}. If undefined, no change is
 *   applied.
 * @param conversationUpdate The current view of the conversation and its fields to be updated. The
 *   fields `conversation.category` and `conversation.visibility` are attached to the conversation
 *   on the model layer but to the group itself on the protocol layer.
 * @returns a constructed {@link protobuf.d2d.GroupSync} message.
 *
 *   IMPORTANT: Missing fields or explicitly undefined fields do not result in a "reset" of the
 *   value but will result in the value **not** being changed.
 */
export function getD2dGroupSyncUpdate(
    groupIdentity: {readonly creatorIdentity: IdentityString; readonly groupId: GroupId},
    groupUpdate?: {readonly view: GroupView; readonly update: GroupUpdate},
    groupMemberChanges?: {
        readonly addedIdentities?: readonly IdentityString[];
        readonly removedIdentities?: {
            readonly removed: readonly IdentityString[];
            readonly type: Exclude<
                protobuf.d2d.GroupSync.Update.MemberStateChange,
                protobuf.d2d.GroupSync.Update.MemberStateChange.ADDED
            >;
        };
        readonly memberIdentities: readonly IdentityString[];
    },
    profilePicture?: D2dProfilePictureUpdate,
    conversationUpdate?: {
        readonly view: ConversationView;
        readonly update: ConversationUpdateFromToSync;
    },
): protobuf.d2d.GroupSync {
    // Calculate the updates of the group itself.
    const updatedGroupView: GroupView | undefined =
        groupUpdate === undefined ? undefined : {...groupUpdate.view, ...groupUpdate.update};
    const updatedGroupConversationView =
        conversationUpdate === undefined
            ? undefined
            : {...conversationUpdate.view, ...conversationUpdate.update};

    const identities = groupMemberChanges?.memberIdentities ?? undefined;

    const memberStateChanges: Record<string, protobuf.d2d.GroupSync.Update.MemberStateChange> = {};
    if (groupMemberChanges?.addedIdentities !== undefined) {
        for (const addedIdentity of groupMemberChanges.addedIdentities) {
            memberStateChanges[addedIdentity] =
                protobuf.d2d.GroupSync.Update.MemberStateChange.ADDED;
        }
    }
    if (groupMemberChanges?.removedIdentities !== undefined) {
        for (const removedIdentity of groupMemberChanges.removedIdentities.removed) {
            memberStateChanges[removedIdentity] = groupMemberChanges.removedIdentities.type;
        }
    }

    return protobuf.utils.creator(protobuf.d2d.GroupSync, {
        update: protobuf.utils.creator(protobuf.d2d.GroupSync.Update, {
            group: protobuf.utils.creator(protobuf.d2d_sync.Group, {
                groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                    creatorIdentity: groupIdentity.creatorIdentity,
                    groupId: u64ToUnsignedLong(groupIdentity.groupId),
                }),
                name: updatedGroupView?.name,
                // `createdAt` is never updated
                createdAt: undefined,
                userState: updatedGroupView?.userState,
                profilePicture: getDeltaImageMessage(profilePicture),
                memberIdentities:
                    identities === undefined
                        ? undefined
                        : protobuf.utils.creator(protobuf.common.Identities, {
                              identities,
                          }),
                notificationTriggerPolicyOverride: getNotificationTriggerOverrideMessage(
                    updatedGroupView?.notificationTriggerPolicyOverride,
                ),
                deprecatedNotificationSoundPolicyOverride: undefined,
                conversationCategory: updatedGroupConversationView?.category,
                conversationVisibility: updatedGroupConversationView?.visibility,
            }),
            memberStateChanges: tag<MemberStateChanges>(memberStateChanges),
        }),
        create: undefined,
        delete: undefined,
    });
}

function getNotificationTriggerOverrideMessage(
    override:
        | {
              readonly policy: GroupNotificationTriggerPolicy;
              readonly expiresAt?: Date;
          }
        | undefined,
): NotificationTriggerPolicyOverride {
    const policy =
        override === undefined
            ? undefined
            : protobuf.utils.creator(
                  protobuf.d2d_sync.Group.NotificationTriggerPolicyOverride.Policy,
                  {
                      policy: override.policy,
                      expiresAt:
                          override.expiresAt === undefined
                              ? undefined
                              : u64ToUnsignedLong(dateToUnixTimestampMs(override.expiresAt)),
                  },
              );

    return protobuf.utils.creator(protobuf.d2d_sync.Group.NotificationTriggerPolicyOverride, {
        policy,
        default: override === undefined ? protobuf.UNIT_MESSAGE : undefined,
    });
}
