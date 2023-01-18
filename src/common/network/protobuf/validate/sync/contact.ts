import * as v from '@badrap/valita';
import Long from 'long';

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
import {DeltaImage, Unit} from '~/common/network/protobuf/validate/common';
import {ensureFeatureMask, ensureIdentityString} from '~/common/network/types';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional} from '~/common/utils/valita-helpers';

/** Validates {@link sync.Contact.ReadReceiptPolicyOverride}. */
const READ_RECEIPT_POLICY_OVERRIDE_SCHEMA = validator(
    sync.Contact.ReadReceiptPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(v.number().map(ReadReceiptPolicyUtils.fromNumber)),
        })
        .rest(v.unknown()),
);

/** Validates {@link sync.Contact.TypingIndicatorPolicyOverride}. */
const TYPING_INDICATOR_POILICY_OVERRIDE_SCHEMA = validator(
    sync.Contact.TypingIndicatorPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(v.number().map(TypingIndicatorPolicyUtils.fromNumber)),
        })
        .rest(v.unknown()),
);

/** Validates {@link sync.Contact.NotificationTriggerPolicyOverride}. */
const NOTIFICATION_TRIGGER_POLICY_OVERRRIDE_SCHEMA = validator(
    sync.Contact.NotificationTriggerPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(
                validator(
                    sync.Contact.NotificationTriggerPolicyOverride.Policy,
                    v
                        .object({
                            policy: v
                                .number()
                                .map(ContactNotificationTriggerPolicyUtils.fromNumber),
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

/** Validates {@link sync.Contact.NotificationSoundPolicyOverride}. */
const NOTIFICATION_SOUND_POLICY_OVERRIDE_SCHEMA = validator(
    sync.Contact.NotificationSoundPolicyOverride,
    v
        .object({
            default: nullOptional(Unit.SCHEMA),
            policy: nullOptional(v.number().map(NotificationSoundPolicyUtils.fromNumber)),
        })
        .rest(v.unknown()),
);

/** Validates generic properties of {@link sync.Contact}. */
const BASE_SCHEMA = validator(sync.Contact, {
    identity: v.string().map(ensureIdentityString),
    publicKey: instanceOf(Uint8Array).map(ensurePublicKey),
    createdAt: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
    firstName: v.string(),
    lastName: v.string(),
    nickname: v.string(),
    verificationLevel: v.number().map(VerificationLevelUtils.fromNumber),
    workVerificationLevel: v.number().map(WorkVerificationLevelUtils.fromNumber),
    identityType: v.number().map(IdentityTypeUtils.fromNumber),
    acquaintanceLevel: v.number().map(AcquaintanceLevelUtils.fromNumber),
    activityState: v.number().map(ActivityStateUtils.fromNumber),
    featureMask: v.number().map(ensureFeatureMask),
    syncState: v.number().map(SyncStateUtils.fromNumber),
    readReceiptPolicyOverride: READ_RECEIPT_POLICY_OVERRIDE_SCHEMA,
    typingIndicatorPolicyOverride: TYPING_INDICATOR_POILICY_OVERRIDE_SCHEMA,
    notificationTriggerPolicyOverride: NOTIFICATION_TRIGGER_POLICY_OVERRRIDE_SCHEMA,
    notificationSoundPolicyOverride: NOTIFICATION_SOUND_POLICY_OVERRIDE_SCHEMA,
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
