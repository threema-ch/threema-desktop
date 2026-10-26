import * as v from '@badrap/valita';
import {d2d_sync} from '@threema/protocol/protobuf';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {ensurePublicKey} from '~/common/crypto';
import {
    AcquaintanceLevelUtils,
    ActivityStateUtils,
    ContactNotificationTriggerPolicyUtils,
    ConversationCategoryUtils,
    ConversationVisibilityUtils,
    IdentityTypeUtils,
    ReadReceiptPolicyUtils,
    SyncStateUtils,
    TypingIndicatorPolicyUtils,
    VerificationLevelUtils,
    WorkVerificationLevelUtils,
} from '~/common/enum';
import {validator} from '~/common/network/protobuf/utils';
import {DeltaImage} from '~/common/network/protobuf/validate/common';
import * as WorkAvailabilityStatus from '~/common/network/protobuf/validate/sync/work-availability-status';
import {
    ensureFeatureMask,
    ensureIdentityString,
    ensureNickname,
    type Nickname,
} from '~/common/network/types';
import {
    instanceOf,
    nullOptional,
    policyOverrideOrValitaDefault,
    policyOverrideWithOptionalExpirationDateOrValitaDefault,
    unsignedLongAsU64,
    VALITA_DEFAULT,
    type ValitaDefault,
} from '~/common/utils/valita-helpers';

function nicknameOrValitaDefault(): v.Type<Nickname | ValitaDefault> {
    return v.string().map((value) => (value === '' ? VALITA_DEFAULT : ensureNickname(value)));
}

/** Validates generic properties of {@link d2d_sync.Contact}. */
const BASE_SCHEMA = validator(d2d_sync.Contact, {
    identity: v.string().map(ensureIdentityString),
    publicKey: instanceOf(Uint8Array).map(ensurePublicKey),
    createdAt: unsignedLongAsU64().map(unixTimestampToDateMs),
    firstName: v.string(),
    lastName: v.string(),
    nickname: nicknameOrValitaDefault(),
    verificationLevel: v.number().map((value) => VerificationLevelUtils.fromNumber(value)),
    workVerificationLevel: v.number().map((value) => WorkVerificationLevelUtils.fromNumber(value)),
    identityType: v.number().map((value) => IdentityTypeUtils.fromNumber(value)),
    acquaintanceLevel: v.number().map((value) => AcquaintanceLevelUtils.fromNumber(value)),
    activityState: v.number().map((value) => ActivityStateUtils.fromNumber(value)),
    featureMask: unsignedLongAsU64().map((value) => ensureFeatureMask(value)),
    syncState: v.number().map((value) => SyncStateUtils.fromNumber(value)),
    readReceiptPolicyOverride: policyOverrideOrValitaDefault(ReadReceiptPolicyUtils),
    typingIndicatorPolicyOverride: policyOverrideOrValitaDefault(TypingIndicatorPolicyUtils),
    notificationTriggerPolicyOverride: policyOverrideWithOptionalExpirationDateOrValitaDefault(
        ContactNotificationTriggerPolicyUtils,
    ),
    /**
     * @deprecated Discarded on receive. The notification sound policy is no longer synced.
     */
    deprecatedNotificationSoundPolicyOverride: v.unknown(),
    contactDefinedProfilePicture: DeltaImage.SCHEMA,
    userDefinedProfilePicture: DeltaImage.SCHEMA,
    conversationCategory: v.number().map((value) => ConversationCategoryUtils.fromNumber(value)),
    conversationVisibility: v
        .number()
        .map((value) => ConversationVisibilityUtils.fromNumber(value)),
    workLastFullSyncAt: nullOptional(unsignedLongAsU64().map(unixTimestampToDateMs)),
    workAvailabilityStatus: nullOptional(WorkAvailabilityStatus.SCHEMA),
});

const BASE_SCHEMA_CREATE = {
    ...BASE_SCHEMA,
    firstName: nullOptional(BASE_SCHEMA.firstName),
    lastName: nullOptional(BASE_SCHEMA.lastName),
    nickname: nullOptional(BASE_SCHEMA.nickname),
    contactDefinedProfilePicture: nullOptional(BASE_SCHEMA.contactDefinedProfilePicture),
    userDefinedProfilePicture: nullOptional(BASE_SCHEMA.userDefinedProfilePicture),
};

/**
 * Validates properties of {@link d2d_sync.Contact} in the context of a {@link d2d.ContactSync.Create}
 */
export const SCHEMA_CREATE = validator(
    d2d_sync.Contact,
    v.object({...BASE_SCHEMA_CREATE}).rest(v.unknown()),
);
export type TypeCreate = v.Infer<typeof SCHEMA_CREATE>;

/**
 * Validates properties of {@link d2d_sync.Contact} in the context of {@link join.EssentialData}
 */
export const SCHEMA_DEVICE_JOIN = validator(
    d2d_sync.Contact,
    v
        .object({
            ...BASE_SCHEMA_CREATE,
            contactDefinedProfilePicture: nullOptional(DeltaImage.SCHEMA_UPDATED_BLOB_KEY_OPTIONAL),
            userDefinedProfilePicture: nullOptional(DeltaImage.SCHEMA_UPDATED_BLOB_KEY_OPTIONAL),
        })
        .rest(v.unknown()),
);
export type TypeDeviceJoin = v.Infer<typeof SCHEMA_DEVICE_JOIN>;

/**
 * Validates properties of {@link d2d_sync.Contact} in the context of a {@link d2d.ContactSync.Update}
 */
export const SCHEMA_UPDATE = validator(
    d2d_sync.Contact,
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
            /**
             * @deprecated Discarded on receive. The notification sound policy is no longer synced.
             */
            deprecatedNotificationSoundPolicyOverride:
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                BASE_SCHEMA.deprecatedNotificationSoundPolicyOverride,
            contactDefinedProfilePicture: nullOptional(BASE_SCHEMA.contactDefinedProfilePicture),
            userDefinedProfilePicture: nullOptional(BASE_SCHEMA.userDefinedProfilePicture),
            conversationCategory: nullOptional(BASE_SCHEMA.conversationCategory),
            conversationVisibility: nullOptional(BASE_SCHEMA.conversationVisibility),
            workLastFullSyncAt: BASE_SCHEMA.workLastFullSyncAt,
            workAvailabilityStatus: BASE_SCHEMA.workAvailabilityStatus,
        })
        .rest(v.unknown()),
);
export type TypeUpdate = v.Infer<typeof SCHEMA_UPDATE>;
