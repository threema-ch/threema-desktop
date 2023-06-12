import * as v from '@badrap/valita';

import {sync} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import * as DeltaImage from '~/common/network/protobuf/validate/common/delta-image';
import * as Identities from '~/common/network/protobuf/validate/common/identities';
import * as Unit from '~/common/network/protobuf/validate/common/unit';
import {NULL_OR_UNDEFINED_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {nullOptional} from '~/common/utils/valita-helpers';

const PROFILE_PICTURE_SHARE_WITH_BASE_SCHEMA = {
    nobody: NULL_OR_UNDEFINED_SCHEMA,
    everyone: NULL_OR_UNDEFINED_SCHEMA,
    allowList: NULL_OR_UNDEFINED_SCHEMA,
};

const PROFILE_PICTURE_SHARE_WITH_SCHEMA_NOBODY = v
    .object({
        ...PROFILE_PICTURE_SHARE_WITH_BASE_SCHEMA,
        policy: v.literal('nobody'),
        nobody: Unit.SCHEMA,
    })
    .rest(v.unknown());

const PROFILE_PICTURE_SHARE_WITH_SCHEMA_EVERYONE = v
    .object({
        ...PROFILE_PICTURE_SHARE_WITH_BASE_SCHEMA,
        policy: v.literal('everyone'),
        everyone: Unit.SCHEMA,
    })
    .rest(v.unknown());

const PROFILE_PICTURE_SHARE_WITH_SCHEMA_ALLOW_LIST = v
    .object({
        ...PROFILE_PICTURE_SHARE_WITH_BASE_SCHEMA,
        policy: v.literal('allowList'),
        allowList: Identities.SCHEMA,
    })
    .rest(v.unknown());

const PROFILE_PICTURE_SHARE_WITH_SCHEMA = validator(
    sync.UserProfile.ProfilePictureShareWith,
    v.union(
        PROFILE_PICTURE_SHARE_WITH_SCHEMA_NOBODY,
        PROFILE_PICTURE_SHARE_WITH_SCHEMA_EVERYONE,
        PROFILE_PICTURE_SHARE_WITH_SCHEMA_ALLOW_LIST,
    ),
);

const IDENTITY_LINK_BASE_SCHEMA = {
    phoneNumber: NULL_OR_UNDEFINED_SCHEMA,
    email: NULL_OR_UNDEFINED_SCHEMA,
};

const IDENTITY_LINK_PHONE_NUMBER_SCHEMA = v
    .object({
        ...IDENTITY_LINK_BASE_SCHEMA,
        type: v.literal('phoneNumber'),
        phoneNumber: v.string(),
        description: v.string(),
    })
    .rest(v.unknown());

const IDENTITY_LINK_EMAIL_SCHEMA = v
    .object({
        ...IDENTITY_LINK_BASE_SCHEMA,
        type: v.literal('email'),
        email: v.string(),
        description: v.string(),
    })
    .rest(v.unknown());

const IDENTITY_LINK_SCHEMA = v.union(IDENTITY_LINK_PHONE_NUMBER_SCHEMA, IDENTITY_LINK_EMAIL_SCHEMA);

const IDENTITY_LINKS_SCHEMA = v
    .object({
        links: v.array(IDENTITY_LINK_SCHEMA),
    })
    .rest(v.unknown());

/** Validates {@link sync.UserProfile} in the context of a new device ({@link join.EssentialData}) */
export const SCHEMA_CREATE = validator(
    sync.UserProfile,
    v
        .object({
            nickname: v.string(),
            profilePicture: nullOptional(DeltaImage.SCHEMA),
            profilePictureShareWith: PROFILE_PICTURE_SHARE_WITH_SCHEMA,
            identityLinks: IDENTITY_LINKS_SCHEMA,
        })
        .rest(v.unknown()),
);
export type CreateType = v.Infer<typeof SCHEMA_CREATE>;

/** Validates {@link sync.UserProfile} in the context of a profile update */
export const SCHEMA_UPDATE = validator(
    sync.UserProfile,
    v
        .object({
            nickname: nullOptional(v.string()),
            profilePicture: nullOptional(DeltaImage.SCHEMA),
            profilePictureShareWith: nullOptional(PROFILE_PICTURE_SHARE_WITH_SCHEMA),
            identityLinks: nullOptional(IDENTITY_LINKS_SCHEMA),
        })
        .rest(v.unknown()),
);
export type UpdateType = v.Infer<typeof SCHEMA_UPDATE>;
