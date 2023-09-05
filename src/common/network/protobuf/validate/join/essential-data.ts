import * as v from '@badrap/valita';

import {ensureNonceHash, type NonceHash} from '~/common/crypto';
import {common, join, sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as DeltaImage from '~/common/network/protobuf/validate/common/delta-image';
import * as Contact from '~/common/network/protobuf/validate/sync/contact';
import * as Group from '~/common/network/protobuf/validate/sync/group';
import * as Settings from '~/common/network/protobuf/validate/sync/settings';
import * as UserProfile from '~/common/network/protobuf/validate/sync/user-profile';
import {profilePictureShareWithFromSchema} from '~/common/network/protobuf/validate/sync/user-profile';
import {ensureIdentityString, ensureServerGroup} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {bytesToHex} from '~/common/utils/byte';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional, unsignedLongAsU64, validate} from '~/common/utils/valita-helpers';

const SCHEMA_IDENTITY_DATA = validator(
    join.EssentialData.IdentityData,
    v
        .object({
            identity: validate(v.string(), ensureIdentityString),
            ck: instanceOf(Uint8Array).map(wrapRawClientKey),
            cspDeviceCookie: nullOptional(instanceOf<ReadonlyUint8Array>(Uint8Array)), // TODO(DESK-999)
            cspServerGroup: validate(v.string(), ensureServerGroup),
        })
        .rest(v.unknown()),
);

const SCHEMA_WORK_CREDENTIALS = validator(
    sync.ThreemaWorkCredentials,
    v
        .object({
            username: v.string(),
            password: v.string(),
        })
        .rest(v.unknown()),
);

const SCHEMA_DEVICE_GROUP_DATA = validator(
    join.EssentialData.DeviceGroupData,
    v
        .object({
            dgk: instanceOf(Uint8Array).map(wrapRawDeviceGroupKey),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_CONTACT = validator(
    join.EssentialData.AugmentedContact,
    v
        .object({
            contact: Contact.SCHEMA_DEVICE_JOIN,
            lastUpdateAt: nullOptional(unsignedLongAsU64().map(unixTimestampToDateMs)),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_GROUP = validator(
    join.EssentialData.AugmentedGroup,
    v
        .object({
            group: Group.SCHEMA_DEVICE_JOIN,
            lastUpdateAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        })
        .rest(v.unknown()),
);

const SCHEMA_AUGMENTED_DISTRIBUTION_LIST = validator(
    join.EssentialData.AugmentedDistributionList,
    v
        .object({
            distributionList: v.unknown(), // TODO(DESK-236)
            lastUpdateAt: unsignedLongAsU64().map(unixTimestampToDateMs),
        })
        .rest(v.unknown()),
);

/**
 * Validates {@link sync.UserProfile} in the context of essential data.
 *
 * Note that we do not re-use {@link sync.UserProfile} because we do stricter validation:
 *
 * - Many of the fields are non-optional
 * - DeltaImage for the profile picture may not be the "removed" variant
 * - DeltaImage for the profile picture does not require a key
 **/
export const SCHEMA_USER_PROFILE = validator(
    sync.UserProfile,
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

/** Validates {@link join.EssentialData} */
export const SCHEMA = validator(
    join.EssentialData,
    v
        .object({
            identityData: SCHEMA_IDENTITY_DATA,
            workCredentials: nullOptional(SCHEMA_WORK_CREDENTIALS),
            deviceGroupData: SCHEMA_DEVICE_GROUP_DATA,
            userProfile: SCHEMA_USER_PROFILE,
            settings: Settings.SCHEMA,
            mdmParameters: v.unknown(), // TODO(DESK-182)
            contacts: v.array(SCHEMA_AUGMENTED_CONTACT),
            groups: v.array(SCHEMA_AUGMENTED_GROUP),
            distributionLists: v.array(SCHEMA_AUGMENTED_DISTRIBUTION_LIST),
            cspHashedNonces: validatedHashedNoncesSet(),
            d2dHashedNonces: validatedHashedNoncesSet(),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
