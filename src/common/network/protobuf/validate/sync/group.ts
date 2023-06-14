import * as v from '@badrap/valita';

import {
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    GroupNotificationTriggerPolicyUtils,
    GroupUserStateUtils,
    NotificationSoundPolicyUtils,
} from '~/common/enum';
import {sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {DeltaImage, GroupIdentity, Identities} from '~/common/network/protobuf/validate/common';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {
    nullOptional,
    policyOverrideOrDefault,
    policyOverrideWithOptionalExpirationDateOrDefault,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';

/** Validates generic properties of {@link sync.Group}. */
const BASE_SCHEMA = validator(sync.Group, {
    groupIdentity: GroupIdentity.SCHEMA,
    name: v.string(),
    createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
    userState: v.number().map(GroupUserStateUtils.fromNumber),
    notificationTriggerPolicyOverride: policyOverrideWithOptionalExpirationDateOrDefault(
        GroupNotificationTriggerPolicyUtils,
    ),
    notificationSoundPolicyOverride: policyOverrideOrDefault(NotificationSoundPolicyUtils),
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
