import * as v from '@badrap/valita';

import {ensurePublicKey} from '~/common/crypto';
import {
    AcquaintanceLevelUtils,
    ActivityStateUtils,
    ContactNotificationTriggerPolicyUtils,
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    IdentityTypeUtils,
    NotificationSoundPolicyUtils,
    ReadReceiptPolicyUtils,
    SyncStateUtils,
    TypingIndicatorPolicyUtils,
    VerificationLevelUtils,
    WorkVerificationLevelUtils,
} from '~/common/enum';
import {sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {DeltaImage} from '~/common/network/protobuf/validate/common';
import {ensureFeatureMask, ensureIdentityString, type Nickname} from '~/common/network/types';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {
    instanceOf,
    nonEmptyStringOrDefault,
    nullOptional,
    policyOverrideOrDefault,
    policyOverrideWithOptionalExpirationDateOrDefault,
    unsignedLongAsU64,
} from '~/common/utils/valita-helpers';

/** Validates generic properties of {@link sync.Contact}. */
const BASE_SCHEMA = validator(sync.Contact, {
    identity: v.string().map(ensureIdentityString),
    publicKey: instanceOf(Uint8Array).map(ensurePublicKey),
    createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
    firstName: v.string(),
    lastName: v.string(),
    nickname: nonEmptyStringOrDefault<Nickname>(),
    verificationLevel: v.number().map(VerificationLevelUtils.fromNumber),
    workVerificationLevel: v.number().map(WorkVerificationLevelUtils.fromNumber),
    identityType: v.number().map(IdentityTypeUtils.fromNumber),
    acquaintanceLevel: v.number().map(AcquaintanceLevelUtils.fromNumber),
    activityState: v.number().map(ActivityStateUtils.fromNumber),
    featureMask: unsignedLongAsU64().map(ensureFeatureMask),
    syncState: v.number().map(SyncStateUtils.fromNumber),
    readReceiptPolicyOverride: policyOverrideOrDefault(ReadReceiptPolicyUtils),
    typingIndicatorPolicyOverride: policyOverrideOrDefault(TypingIndicatorPolicyUtils),
    notificationTriggerPolicyOverride: policyOverrideWithOptionalExpirationDateOrDefault(
        ContactNotificationTriggerPolicyUtils,
    ),
    notificationSoundPolicyOverride: policyOverrideOrDefault(NotificationSoundPolicyUtils),
    contactDefinedProfilePicture: DeltaImage.SCHEMA,
    userDefinedProfilePicture: DeltaImage.SCHEMA,
    conversationCategory: v.number().map(ConversationCategoryUtils.fromNumber),
    conversationVisibility: v.number().map(ConversationVisibilityUtils.fromNumber),
});

/**
 * Validates properties of {@link sync.Contact} in the context of a {@link d2d.ContactSync.Create}
 */
export const SCHEMA_CREATE = validator(
    sync.Contact,
    v
        .object({
            ...BASE_SCHEMA,
            firstName: nullOptional(BASE_SCHEMA.firstName),
            lastName: nullOptional(BASE_SCHEMA.lastName),
            nickname: nullOptional(BASE_SCHEMA.nickname),
            contactDefinedProfilePicture: nullOptional(BASE_SCHEMA.contactDefinedProfilePicture),
            userDefinedProfilePicture: nullOptional(BASE_SCHEMA.userDefinedProfilePicture),
        })
        .rest(v.unknown()),
);
export type CreateType = v.Infer<typeof SCHEMA_CREATE>;

/**
 * Validates properties of {@link sync.Contact} in the context of a {@link d2d.ContactSync.Update}
 */
export const SCHEMA_UPDATE = validator(
    sync.Contact,
    v
        .object({
            identity: BASE_SCHEMA.identity,
            publicKey: v.unknown(),
            createdAt: nullOptional(BASE_SCHEMA.createdAt),
            firstName: nullOptional(BASE_SCHEMA.firstName),
            lastName: nullOptional(BASE_SCHEMA.lastName),
            nickname: nullOptional(BASE_SCHEMA.nickname),
            verificationLevel: nullOptional(BASE_SCHEMA.verificationLevel),
            workVerificationLevel: nullOptional(BASE_SCHEMA.workVerificationLevel),
            identityType: nullOptional(BASE_SCHEMA.identityType),
            acquaintanceLevel: nullOptional(BASE_SCHEMA.acquaintanceLevel),
            activityState: nullOptional(BASE_SCHEMA.activityState),
            featureMask: nullOptional(BASE_SCHEMA.featureMask),
            syncState: nullOptional(BASE_SCHEMA.syncState),
            readReceiptPolicyOverride: nullOptional(BASE_SCHEMA.readReceiptPolicyOverride),
            typingIndicatorPolicyOverride: nullOptional(BASE_SCHEMA.typingIndicatorPolicyOverride),
            notificationTriggerPolicyOverride: nullOptional(
                BASE_SCHEMA.notificationTriggerPolicyOverride,
            ),
            notificationSoundPolicyOverride: nullOptional(
                BASE_SCHEMA.notificationSoundPolicyOverride,
            ),
            contactDefinedProfilePicture: nullOptional(BASE_SCHEMA.contactDefinedProfilePicture),
            userDefinedProfilePicture: nullOptional(BASE_SCHEMA.userDefinedProfilePicture),
            conversationCategory: nullOptional(BASE_SCHEMA.conversationCategory),
            conversationVisibility: nullOptional(BASE_SCHEMA.conversationVisibility),
        })
        .rest(v.unknown()),
);
export type UpdateType = v.Infer<typeof SCHEMA_UPDATE>;
export type Type = CreateType | UpdateType;
