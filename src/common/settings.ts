import * as v from '@badrap/valita';

import {type ProfilePictureShareWith} from '~/common/model/settings/profile';
import {IDENTITY_STRING_LIST_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureNickname} from '~/common/network/types';
import * as proto from '~/common/node/settings/settings';
import {type ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {instanceOf} from '~/common/utils/valita-helpers';

/**
 * Convert a protobuf {@link proto.ProfileSettings_ProfilePictureShareWith} into our own
 * {@link ProfilePictureShareWith} type.
 */
function simplifyProfilePictureShareWith(
    profilePictureShareWith: proto.ProfileSettings_ProfilePictureShareWith,
): ProfilePictureShareWith | undefined {
    if (profilePictureShareWith.policy === undefined) {
        return undefined;
    }
    switch (profilePictureShareWith.policy.$case) {
        case 'everyone':
            return {group: 'everyone'};
        case 'nobody':
            return {group: 'nobody'};
        case 'allowList': {
            const allowListIdentities: string[] =
                profilePictureShareWith.policy.allowList.identities;
            return {
                group: 'allowList',
                allowList: IDENTITY_STRING_LIST_SCHEMA.parse(allowListIdentities),
            };
        }
        default:
            return unreachable(profilePictureShareWith.policy);
    }
}

/**
 * Validation schema for the Profile Settings parameters.
 *
 * @throws {ValitaError} In case validation fails.
 */
const PROFILE_SETTINGS_SCHEMA = v
    .object({
        // The user's nickname
        nickname: v.string().map(ensureNickname).optional(),

        // The user's profile picture
        profilePicture: instanceOf<ReadonlyUint8Array>(Uint8Array).optional(),
        profilePictureShareWith: v
            .record()
            .map(simplifyProfilePictureShareWith)
            .default({group: 'everyone'} as ProfilePictureShareWith),
    })
    .rest(v.unknown());

/**
 * Validated profile settings.
 */
export type ProfileSettings = v.Infer<typeof PROFILE_SETTINGS_SCHEMA>;

export interface Settings {
    profile: ProfileSettings;
}

type CategoryCodecs = {
    readonly [TKey in keyof Settings]: {
        readonly encode: (settings: Settings[TKey]) => Uint8Array;
        readonly decode: (encoded: Uint8Array) => Settings[TKey];
    };
};

export const SETTINGS_CODEC: CategoryCodecs = {
    profile: {
        encode: (settings) => {
            // Convert `settings.profilePictureShareWith` to its protobuf representation
            let profilePictureShareWith: proto.ProfileSettings['profilePictureShareWith'];
            switch (settings.profilePictureShareWith.group) {
                case 'everyone':
                    profilePictureShareWith = {policy: {$case: 'everyone', everyone: proto.Unit}};
                    break;
                case 'nobody':
                    profilePictureShareWith = {policy: {$case: 'nobody', nobody: proto.Unit}};
                    break;
                case 'allowList':
                    profilePictureShareWith = {
                        policy: {
                            $case: 'allowList',
                            allowList: {
                                identities: [...settings.profilePictureShareWith.allowList],
                            },
                        },
                    };
                    break;
                default:
                    unreachable(settings.profilePictureShareWith);
            }

            // Encode protobuf
            return proto.ProfileSettings.encode({
                nickname: settings.nickname,
                profilePicture: settings.profilePicture as Uint8Array | undefined,
                profilePictureShareWith,
            }).finish();
        },
        decode: (encoded) => PROFILE_SETTINGS_SCHEMA.parse(proto.ProfileSettings.decode(encoded)),
    },
} as const;
