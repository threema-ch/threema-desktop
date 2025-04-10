import type {Nonce} from '~/common/crypto';
import {
    ConversationCategory,
    ConversationVisibility,
    type GroupNotificationTriggerPolicy,
    type GroupUserState,
    type NotificationSoundPolicy,
} from '~/common/enum';
import type {GroupUpdate, GroupView} from '~/common/model';
import type {
    ConversationUpdateFromToSync,
    ConversationView,
} from '~/common/model/types/conversation';
import * as protobuf from '~/common/network/protobuf';
import type {ProtobufMessage} from '~/common/network/protobuf/tag';
import type {BlobId} from '~/common/network/protocol/blob';
import type {GroupId, IdentityString} from '~/common/network/types';
import type {RawBlobKey} from '~/common/network/types/keys';
import {tag, type ReadonlyUint8Array, type WeakOpaque} from '~/common/types';
import {dateToUnixTimestampMs, intoUnsignedLong} from '~/common/utils/number';

// Return types for the helper functions to be compatible when creating protobuf messages.
type MemberStateChanges = WeakOpaque<
    Record<string, protobuf.d2d.GroupSync.Update.MemberStateChange>,
    ProtobufMessage
>;
type DeltaImage = WeakOpaque<protobuf.common.DeltaImage, ProtobufMessage>;
type NotificationSoundPolicyOverride = WeakOpaque<
    protobuf.sync.Group.NotificationSoundPolicyOverride,
    ProtobufMessage
>;
type NotificationTriggerPolicyOverride = WeakOpaque<
    protobuf.sync.Group.NotificationTriggerPolicyOverride,
    ProtobufMessage
>;

// Necessary information to create a `DeltaImage` message.
type ProfilePictureUpdate =
    | {
          readonly type: 'removed';
      }
    | {
          readonly type: 'updated';
          readonly blob: {
              readonly blobId: BlobId;
              readonly key: RawBlobKey;
              readonly nonce: Nonce;
              readonly uploadedAt: Date;
          };
      };

// Policy defaults
const DEFAULT_POLICY_OVERRIDE = {
    default: protobuf.UNIT_MESSAGE,
    policy: undefined,
} as const;
const DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Group.NotificationTriggerPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
);
const DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE = protobuf.utils.creator(
    protobuf.sync.Group.NotificationSoundPolicyOverride,
    DEFAULT_POLICY_OVERRIDE,
);

/**
 * Construct a {@link protobuf.d2d.GroupSync} message with inner type {@link protobuf.d2d.GroupSync.Create}
 *
 * This message only reflects the necessary information for creating a group. For other changes to
 * the group, use {@link getD2dGroupSyncUpdate}.
 */
export function getD2dGroupSyncCreate(
    groupIdentity: {readonly creatorIdentity: IdentityString; readonly groupId: GroupId},
    createdAt: Date,
    memberIdentities: readonly IdentityString[],
    userState: GroupUserState,
): protobuf.d2d.GroupSync {
    return protobuf.utils.creator(protobuf.d2d.GroupSync, {
        create: protobuf.utils.creator(protobuf.d2d.GroupSync.Create, {
            group: protobuf.utils.creator(protobuf.sync.Group, {
                groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                    creatorIdentity: groupIdentity.creatorIdentity,
                    groupId: intoUnsignedLong(groupIdentity.groupId),
                }),
                name: '',
                createdAt: intoUnsignedLong(dateToUnixTimestampMs(createdAt)),
                userState,
                profilePicture: undefined,
                memberIdentities: protobuf.utils.creator(protobuf.common.Identities, {
                    identities: memberIdentities,
                }),
                notificationTriggerPolicyOverride: DEFAULT_NOTIFICATION_TRIGGER_POLICY_OVERRIDE,
                notificationSoundPolicyOverride: DEFAULT_NOTIFICATION_SOUND_POLICY_OVERRIDE,
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
 * {@link protobuf.d2d.GroupSync.Update}
 *
 * @param groupIdentity The identity of the group to be updated.
 * @param groupUpdate The current view of the group and the fields to be updated.
 * @param groupMemberChanges The member list to be reflected. Contains an additional hint for the
 *   receiver side to know which contacts were added/removed and whether removal happend through
 *   kicking or through leaving.
 * @param profilePicture The updated {@link ProfilePictureUpdate}. If undefined, no change is applied.
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
        readonly addedIdentities?: ReadonlySet<IdentityString>;
        readonly removedIdentities?: {
            readonly removed: ReadonlySet<IdentityString>;
            readonly type: Exclude<
                protobuf.d2d.GroupSync.Update.MemberStateChange,
                protobuf.d2d.GroupSync.Update.MemberStateChange.ADDED
            >;
        };
        readonly memberIdentities: ReadonlySet<IdentityString>;
    },
    profilePicture?: ProfilePictureUpdate,
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

    // Create the new member list and map the member state changes into the correct format.
    const identities =
        groupMemberChanges?.memberIdentities === undefined
            ? undefined
            : [...groupMemberChanges.memberIdentities];

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
            group: protobuf.utils.creator(protobuf.sync.Group, {
                groupIdentity: protobuf.utils.creator(protobuf.common.GroupIdentity, {
                    creatorIdentity: groupIdentity.creatorIdentity,
                    groupId: intoUnsignedLong(groupIdentity.groupId),
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
                notificationSoundPolicyOverride: getNotificationSoundPolicyOverrideMessage(
                    updatedGroupView?.notificationSoundPolicyOverride,
                ),
                conversationCategory: updatedGroupConversationView?.category,
                conversationVisibility: updatedGroupConversationView?.visibility,
            }),
            memberStateChanges: tag<MemberStateChanges>(memberStateChanges),
        }),
        create: undefined,
        delete: undefined,
    });
}

function getNotificationSoundPolicyOverrideMessage(
    override: NotificationSoundPolicy | undefined,
): NotificationSoundPolicyOverride | undefined {
    if (override === undefined) {
        return undefined;
    }
    return protobuf.utils.creator(protobuf.sync.Group.NotificationSoundPolicyOverride, {
        policy: override,
        default: protobuf.UNIT_MESSAGE,
    });
}

function getNotificationTriggerOverrideMessage(
    override:
        | {
              readonly policy: GroupNotificationTriggerPolicy;
              readonly expiresAt?: Date;
          }
        | undefined,
): NotificationTriggerPolicyOverride | undefined {
    if (override === undefined) {
        return undefined;
    }
    return protobuf.utils.creator(protobuf.sync.Group.NotificationTriggerPolicyOverride, {
        policy: protobuf.utils.creator(
            protobuf.sync.Group.NotificationTriggerPolicyOverride.Policy,
            {
                policy: override.policy,
                expiresAt:
                    override.expiresAt === undefined
                        ? undefined
                        : intoUnsignedLong(dateToUnixTimestampMs(override.expiresAt)),
            },
        ),
        default: protobuf.UNIT_MESSAGE,
    });
}

function getDeltaImageMessage(profilePicture?: ProfilePictureUpdate): DeltaImage | undefined {
    if (profilePicture === undefined) {
        return undefined;
    }
    if (profilePicture.type === 'removed') {
        return protobuf.utils.creator(protobuf.common.DeltaImage, {
            updated: undefined,
            removed: protobuf.UNIT_MESSAGE,
        });
    }
    return protobuf.utils.creator(protobuf.common.DeltaImage, {
        removed: undefined,
        updated: protobuf.utils.creator(protobuf.common.Image, {
            blob: protobuf.utils.creator(protobuf.common.Blob, {
                id: profilePicture.blob.blobId as ReadonlyUint8Array as Uint8Array,
                key: profilePicture.blob.key.unwrap(),
                uploadedAt: intoUnsignedLong(dateToUnixTimestampMs(profilePicture.blob.uploadedAt)),
                nonce: profilePicture.blob.nonce,
            }),
            type: protobuf.common.Image.Type.JPEG,
        }),
    });
}
