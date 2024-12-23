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
    policyOverrideOrValitaDefault,
    policyOverrideWithOptionalExpirationDateOrValitaDefault,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';

/** Validates generic properties of {@link sync.Group}. */
const BASE_SCHEMA = validator(sync.Group, {
    groupIdentity: GroupIdentity.SCHEMA,
    name: v.string(),
    createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
    userState: v.number().map((value) => GroupUserStateUtils.fromNumber(value)),
    notificationTriggerPolicyOverride: policyOverrideWithOptionalExpirationDateOrValitaDefault(
        GroupNotificationTriggerPolicyUtils,
    ),
    notificationSoundPolicyOverride: policyOverrideOrValitaDefault(NotificationSoundPolicyUtils),
    profilePicture: DeltaImage.SCHEMA,
    memberIdentities: Identities.SCHEMA,
    conversationCategory: v.number().map((value) => ConversationCategoryUtils.fromNumber(value)),
    conversationVisibility: v
        .number()
        .map((value) => ConversationVisibilityUtils.fromNumber(value)),
});

const BASE_SCHEMA_CREATE = {
    ...BASE_SCHEMA,
    profilePicture: nullOptional(BASE_SCHEMA.profilePicture),
};

/**
 * Validates properties of {@link sync.Group} in the context of a {@link d2d.GroupSync.Create}
 */
export const SCHEMA_CREATE = validator(
    sync.Group,
    v.object({...BASE_SCHEMA_CREATE}).rest(v.unknown()),
);
export type TypeCreate = v.Infer<typeof SCHEMA_CREATE>;

/**
 * Validates properties of {@link sync.Group} in the context of {@link join.EssentialData}
 */
export const SCHEMA_DEVICE_JOIN = validator(
    sync.Group,
    v
        .object({
            ...BASE_SCHEMA_CREATE,
            profilePicture: nullOptional(DeltaImage.SCHEMA_UPDATED_BLOB_KEY_OPTIONAL),
        })
        .rest(v.unknown()),
);
export type TypeDeviceJoin = v.Infer<typeof SCHEMA_DEVICE_JOIN>;

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
export type TypeUpdate = v.Infer<typeof SCHEMA_UPDATE>;
