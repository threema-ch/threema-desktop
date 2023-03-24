import * as v from '@badrap/valita';
import Long from 'long';

import {
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    GroupNotificationTriggerPolicyUtils,
    GroupUserStateUtils,
    NotificationSoundPolicyUtils,
} from '~/common/enum';
import {sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {
    DeltaImage,
    GroupIdentity,
    Identities,
    Unit,
} from '~/common/network/protobuf/validate/common';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional} from '~/common/utils/valita-helpers';

/** Validates {@link sync.Group.NotificationTriggerPolicyOverride}. */
const NOTIFICATION_TRIGGER_POLICY_OVERRIDE_SCHEMA = validator(
    sync.Group.NotificationTriggerPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(
                validator(
                    sync.Group.NotificationTriggerPolicyOverride.Policy,
                    v
                        .object({
                            policy: v.number().map(GroupNotificationTriggerPolicyUtils.fromNumber),
                            expiresAt: nullOptional(
                                instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
                            ),
                        })
                        .rest(v.unknown()),
                ),
            ),
        })
        .rest(v.unknown()),
);

/** Validates {@link sync.Group.NotificationSoundPolicyOverride}. */
const NOTIFICATION_SOUND_POLICY_OVERRIDE_SCHEMA = validator(
    sync.Group.NotificationSoundPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(v.number().map(NotificationSoundPolicyUtils.fromNumber)),
        })
        .rest(v.unknown()),
);

/** Validates generic properties of {@link sync.Group}. */
const BASE_SCHEMA = validator(sync.Group, {
    groupIdentity: GroupIdentity.SCHEMA,
    name: v.string(),
    createdAt: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
    userState: v.number().map(GroupUserStateUtils.fromNumber),
    notificationTriggerPolicyOverride: NOTIFICATION_TRIGGER_POLICY_OVERRIDE_SCHEMA,
    notificationSoundPolicyOverride: NOTIFICATION_SOUND_POLICY_OVERRIDE_SCHEMA,
    profilePicture: DeltaImage.SCHEMA,
    memberIdentities: Identities.SCHEMA,
    conversationCategory: v.number().map(ConversationCategoryUtils.fromNumber),
    conversationVisibility: v.number().map(ConversationVisibilityUtils.fromNumber),
});

/**
 * Validates properties of {@link sync.Group} in the context of a {@link d2d.GroupSync.Create}
 */
export const SCHEMA_CREATE = validator(
    sync.Group,
    v
        .object({
            ...BASE_SCHEMA,
            profilePicture: nullOptional(BASE_SCHEMA.profilePicture),
        })
        .rest(v.unknown()),
);
export type CreateType = v.Infer<typeof SCHEMA_CREATE>;

/**
 * Validates properties of {@link sync.Group} in the context of a {@link d2d.GroupSync.Update}
 */
export const SCHEMA_UPDATE = validator(
    sync.Group,
    v
        .object({
            groupIdentity: BASE_SCHEMA.groupIdentity,
            name: nullOptional(BASE_SCHEMA.name),
            createdAt: nullOptional(BASE_SCHEMA.createdAt),
            userState: nullOptional(BASE_SCHEMA.userState),
            notificationTriggerPolicyOverride: nullOptional(
                BASE_SCHEMA.notificationTriggerPolicyOverride,
            ),
            notificationSoundPolicyOverride: nullOptional(
                BASE_SCHEMA.notificationSoundPolicyOverride,
            ),
            profilePicture: nullOptional(BASE_SCHEMA.profilePicture),
            memberIdentities: nullOptional(BASE_SCHEMA.memberIdentities),
            conversationCategory: nullOptional(BASE_SCHEMA.conversationCategory),
            conversationVisibility: nullOptional(BASE_SCHEMA.conversationVisibility),
        })
        .rest(v.unknown()),
);
export type UpdateType = v.Infer<typeof SCHEMA_UPDATE>;
export type Type = CreateType | UpdateType;
