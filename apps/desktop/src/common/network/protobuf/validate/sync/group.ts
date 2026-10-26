import * as v from '@badrap/valita';
import {d2d_sync} from '@threema/protocol/protobuf';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    GroupNotificationTriggerPolicyUtils,
    GroupUserStateUtils,
} from '~/common/enum';
import {validator} from '~/common/network/protobuf/utils';
import {DeltaImage, GroupIdentity, Identities} from '~/common/network/protobuf/validate/common';
import {
    nullOptional,
    policyOverrideWithOptionalExpirationDateOrValitaDefault,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';

/** Validates generic properties of {@link d2d_sync.Group}. */
const BASE_SCHEMA = validator(d2d_sync.Group, {
    groupIdentity: GroupIdentity.SCHEMA,
    name: v.string(),
    createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
    userState: v.number().map((value) => GroupUserStateUtils.fromNumber(value)),
    notificationTriggerPolicyOverride: policyOverrideWithOptionalExpirationDateOrValitaDefault(
        GroupNotificationTriggerPolicyUtils,
    ),
    /**
     * @deprecated Discarded on receive. The notification sound policy is no longer synced.
     */
    deprecatedNotificationSoundPolicyOverride: v.unknown(),
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
 * Validates properties of {@link d2d_sync.Group} in the context of a {@link d2d.GroupSync.Create}
 */
export const SCHEMA_CREATE = validator(
    d2d_sync.Group,
    v.object({...BASE_SCHEMA_CREATE}).rest(v.unknown()),
);
export type TypeCreate = v.Infer<typeof SCHEMA_CREATE>;

/**
 * Validates properties of {@link d2d_sync.Group} in the context of {@link join.EssentialData}
 */
export const SCHEMA_DEVICE_JOIN = validator(
    d2d_sync.Group,
    v
        .object({
            ...BASE_SCHEMA_CREATE,
            profilePicture: nullOptional(DeltaImage.SCHEMA_UPDATED_BLOB_KEY_OPTIONAL),
        })
        .rest(v.unknown()),
);
export type TypeDeviceJoin = v.Infer<typeof SCHEMA_DEVICE_JOIN>;

/**
 * Validates properties of {@link d2d_sync.Group} in the context of a {@link d2d.GroupSync.Update}
 */
export const SCHEMA_UPDATE = validator(
    d2d_sync.Group,
    v
        .object({
            groupIdentity: BASE_SCHEMA.groupIdentity,
            name: nullOptional(BASE_SCHEMA.name),
            createdAt: nullOptional(BASE_SCHEMA.createdAt),
            userState: nullOptional(BASE_SCHEMA.userState),
            notificationTriggerPolicyOverride: nullOptional(
                BASE_SCHEMA.notificationTriggerPolicyOverride,
            ),
            /**
             * @deprecated Discarded on receive. The notification sound policy is no longer synced.
             */
            deprecatedNotificationSoundPolicyOverride:
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                BASE_SCHEMA.deprecatedNotificationSoundPolicyOverride,
            profilePicture: nullOptional(BASE_SCHEMA.profilePicture),
            memberIdentities: nullOptional(BASE_SCHEMA.memberIdentities),
            conversationCategory: nullOptional(BASE_SCHEMA.conversationCategory),
            conversationVisibility: nullOptional(BASE_SCHEMA.conversationVisibility),
        })
        .rest(v.unknown()),
);
export type TypeUpdate = v.Infer<typeof SCHEMA_UPDATE>;
