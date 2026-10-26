import * as v from '@badrap/valita';
import {common, d2d_join, d2d_sync} from '@threema/protocol/protobuf';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {ensureNonceHash, type NonceHash} from '~/common/crypto';
import {WorkAvailabilityStatusCategory} from '~/common/enum';
import type {WorkAvailabilityStatus} from '~/common/model/types/work-availability-status';
import {validator} from '~/common/network/protobuf/utils';
import * as DeltaImage from '~/common/network/protobuf/validate/common/delta-image';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import * as Contact from '~/common/network/protobuf/validate/sync/contact';
import * as Group from '~/common/network/protobuf/validate/sync/group';
import * as Settings from '~/common/network/protobuf/validate/sync/settings';
import * as UserProfile from '~/common/network/protobuf/validate/sync/user-profile';
import {profilePictureShareWithFromSchema} from '~/common/network/protobuf/validate/sync/user-profile';
import * as WorkAvailabilityStatusSchema from '~/common/network/protobuf/validate/sync/work-availability-status';
import {ensureDeviceCookie, ensureIdentityString, ensureServerGroup} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {instanceOf, nullOptional, unsignedLongAsU64, validate} from '~/common/utils/valita-helpers';

const SCHEMA_IDENTITY_DATA = validator(
    d2d_join.EssentialData.IdentityData,
    v
        .object({
            identity: validate(v.string(), ensureIdentityString),
            ck: instanceOf(Uint8Array).map(wrapRawClientKey),
            cspDeviceCookie: instanceOf<ReadonlyUint8Array>(Uint8Array).map(ensureDeviceCookie),
            cspServerGroup: validate(v.string(), ensureServerGroup),
        })
        .rest(v.unknown()),
);

const SCHEMA_WORK_CREDENTIALS = validator(
    d2d_sync.ThreemaWorkCredentials,
    v
        .object({
            username: v.string(),
            password: v.string(),
        })
        .rest(v.unknown()),
);

const SCHEMA_DEVICE_GROUP_DATA = validator(
    d2d_join.EssentialData.DeviceGroupData,
    v
        .object({
            dgk: instanceOf(Uint8Array).map(wrapRawDeviceGroupKey),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_CONTACT = validator(
    d2d_join.EssentialData.AugmentedContact,
    v
        .object({
            contact: Contact.SCHEMA_DEVICE_JOIN,
            lastUpdateAt: nullOptional(unsignedLongAsU64().map(unixTimestampToDateMs)),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_GROUP = validator(
    d2d_join.EssentialData.AugmentedGroup,
    v
        .object({
            group: Group.SCHEMA_DEVICE_JOIN,
            lastUpdateAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_DISTRIBUTION_LIST = validator(
    d2d_join.EssentialData.AugmentedDistributionList,
    v
        .object({
            distributionList: v.unknown(), // TODO(DESK-236)
            lastUpdateAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        })
        .rest(v.unknown()),
);

/** Base schema for an oneof {@link d2d_join.essentialData.mdmParameters} instance */
const BASE_SCHEMA = {
    integerValue: NULL_OR_UNDEFINED_SCHEMA,
    stringValue: NULL_OR_UNDEFINED_SCHEMA,
    booleanValue: NULL_OR_UNDEFINED_SCHEMA,
};

const SCHEMA_BIGINT = v.object({
    ...BASE_SCHEMA,
    value: v.literal('integerValue'),
    integerValue: unsignedLongAsU64(),
});
const SCHEMA_BOOL = v.object({
    ...BASE_SCHEMA,
    value: v.literal('booleanValue'),
    booleanValue: v.boolean(),
});

const SCHEMA_STRING = v.object({
    ...BASE_SCHEMA,
    value: v.literal('stringValue'),
    stringValue: v.string(),
});

export const SCHEMA_MDM_PARAMETERS = v.record(v.union(SCHEMA_BIGINT, SCHEMA_BOOL, SCHEMA_STRING));

/**
 * Validates  {@link d2d_sync.UserProfile} in the context of essential data.
 *
 * Note that we do not re-use {@link d2d_sync.UserProfile} because we do stricter validation:
 *
 * - Many of the fields are non-optional
 * - DeltaImage for the profile picture may not be the "removed" variant
 * - DeltaImage for the profile picture does not require a key
 **/
export const SCHEMA_USER_PROFILE = validator(
    d2d_sync.UserProfile,
    v
        .object({
            nickname: v.string(),
            profilePicture: nullOptional(
                validator(common.DeltaImage, DeltaImage.SCHEMA_UPDATED_BLOB_KEY_OPTIONAL),
            ),
            profilePictureShareWith: UserProfile.PROFILE_PICTURE_SHARE_WITH_SCHEMA.map(
                profilePictureShareWithFromSchema,
            ),
            identityLinks: UserProfile.IDENTITY_LINKS_SCHEMA,
            workAvailabilityStatus: nullOptional(
                WorkAvailabilityStatusSchema.SCHEMA,
            ).default<WorkAvailabilityStatus>({
                category: WorkAvailabilityStatusCategory.NONE,
                description: '',
            }),
        })
        .rest(v.unknown()),
);

function validatedHashedNoncesSet(): v.Type<Set<NonceHash>> {
    return v.array(validate(instanceOf(Uint8Array), ensureNonceHash)).map((array) => {
        // To ensure that duplicate hashes are filtered out, pass all hashes through a map, where
        // the key is a string (and thus properly implements equality comparison, in contrast to a
        // Uint8Array).
        const hashes = new Map(array.map((value) => [bytesToHex(value), value]));
        return new Set(hashes.values());
    });
}

/** Validates {@link d2d_join.EssentialData} */
export const SCHEMA = validator(
    d2d_join.EssentialData,
    v
        .object({
            identityData: SCHEMA_IDENTITY_DATA,
            workCredentials: nullOptional(SCHEMA_WORK_CREDENTIALS),
            deviceGroupData: SCHEMA_DEVICE_GROUP_DATA,
            userProfile: SCHEMA_USER_PROFILE,
            settings: Settings.SCHEMA,
            mdmParameters: nullOptional(
                v.object({threemaParameters: SCHEMA_MDM_PARAMETERS}).rest(v.unknown()),
            ), // TODO(DESK-182)
            contacts: v.array(SCHEMA_AUGMENTED_CONTACT),
            groups: v.array(SCHEMA_AUGMENTED_GROUP),
            distributionLists: v.array(SCHEMA_AUGMENTED_DISTRIBUTION_LIST),
            cspHashedNonces: validatedHashedNoncesSet(),
            d2dHashedNonces: validatedHashedNoncesSet(),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
