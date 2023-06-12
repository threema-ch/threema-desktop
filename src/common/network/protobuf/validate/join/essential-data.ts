import * as v from '@badrap/valita';

import {common, join, sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as DeltaImage from '~/common/network/protobuf/validate/common/delta-image';
import * as Contact from '~/common/network/protobuf/validate/sync/contact';
import * as Group from '~/common/network/protobuf/validate/sync/group';
import * as Settings from '~/common/network/protobuf/validate/sync/settings';
import * as UserProfile from '~/common/network/protobuf/validate/sync/user-profile';
import {ensureIdentityString, ensureServerGroup} from '~/common/network/types';
import {wrapRawClientKey, wrapRawDeviceGroupKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array} from '~/common/types';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, nullOptional, unsignedLongAsU64} from '~/common/utils/valita-helpers';

const SCHEMA_IDENTITY_DATA = validator(
    join.EssentialData.IdentityData,
    v
        .object({
            identity: v.string().map(ensureIdentityString),
            ck: instanceOf(Uint8Array).map(wrapRawClientKey),
            cspDeviceCookie: nullOptional(instanceOf<ReadonlyUint8Array>(Uint8Array)), // TODO(DESK-999)
            cspServerGroup: v.string().map(ensureServerGroup),
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
            profilePictureShareWith: UserProfile.PROFILE_PICTURE_SHARE_WITH_SCHEMA,
            identityLinks: UserProfile.IDENTITY_LINKS_SCHEMA,
        })
        .rest(v.unknown()),
);

/** Validates {@link join.EssentialData} */
export const SCHEMA = validator(
    join.EssentialData,
    v
        .object({
            mediatorServer: v.unknown(), // TODO(SE-337)
            identityData: SCHEMA_IDENTITY_DATA,
            deviceGroupData: SCHEMA_DEVICE_GROUP_DATA,
            userProfile: SCHEMA_USER_PROFILE,
            settings: Settings.SCHEMA,
            mdmParameters: v.unknown(), // TODO(DESK-182)
            contacts: v.array(SCHEMA_AUGMENTED_CONTACT),
            groups: v.array(SCHEMA_AUGMENTED_GROUP),
            distributionLists: v.array(SCHEMA_AUGMENTED_DISTRIBUTION_LIST),
            cspHashedNonces: v.array(instanceOf(Uint8Array)), // TODO(DESK-1064)
            d2dHashedNonces: v.array(instanceOf(Uint8Array)), // TODO(DESK-1064)
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
