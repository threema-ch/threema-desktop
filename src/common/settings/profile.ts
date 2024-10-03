import * as v from '@badrap/valita';

import * as proto from '~/common/internal-protobuf/settings';
import type {ProfilePictureShareWith} from '~/common/model/settings/profile';
import {IDENTITY_STRING_LIST_SCHEMA} from '~/common/network/protobuf/validate/helpers';
import {ensureBlobId} from '~/common/network/protocol/blob';
import {ensureNickname} from '~/common/network/types';
import {wrapRawBlobKey} from '~/common/network/types/keys';
import type {SettingsCategoryCodec} from '~/common/settings';
import type {ReadonlyUint8Array} from '~/common/types';
import {unreachable} from '~/common/utils/assert';
import {intoUnsignedLong, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

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
        profilePicture: v
            .object({
                blob: instanceOf<ReadonlyUint8Array>(Uint8Array),
                // TODO(DESK-1612) Make these fields mandatory.
                blobId: instanceOf(Uint8Array)
                    .map((val) => ensureBlobId(val))
                    .optional(),
                lastUploadedAt: unsignedLongAsU64().map(unixTimestampToDateMs).optional(),
                key: instanceOf<Uint8Array>(Uint8Array).map(wrapRawBlobKey).optional(),
            })
            .rest(v.unknown())
            .optional(),
        profilePictureShareWith: v
            .record()
            .map(simplifyProfilePictureShareWith)
            .default<ProfilePictureShareWith>({group: 'everyone'}),
    })
    .rest(v.unknown());

/**
 * Validated profile settings.
 */
export type ProfileSettings = v.Infer<typeof PROFILE_SETTINGS_SCHEMA>;

/**
 * Unfortunately, protobuf will lose backwards compatibility if new nested messages are created
 * within existing messages. Therefore, the profile picture properties in protobuf need to be flat
 * while in the models, we want them nested. This leads to the restructuring dance below.
 */
export const PROFILE_SETTINGS_CODEC: SettingsCategoryCodec<'profile'> = {
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
        let profilePicture: {
            blob: Uint8Array | undefined;
            blobId: Uint8Array | undefined;
            key: Uint8Array | undefined;
        } = {
            blob: undefined,
            blobId: undefined,
            key: undefined,
        };
        if (settings.profilePicture?.blob !== undefined) {
            // If the profile is not undefined, we also need to deliver a blob Id
            profilePicture = {
                blob: settings.profilePicture.blob as Uint8Array,
                blobId: settings.profilePicture.blobId as ReadonlyUint8Array as Uint8Array,
                key: settings.profilePicture.key?.unwrap(),
            };
        }
        // Encode protobuf
        return proto.ProfileSettings.encode({
            nickname: settings.nickname,
            profilePictureBlob: profilePicture.blob,
            profilePictureBlobId: profilePicture.blobId,
            profilePictureKey: profilePicture.key,
            profilePictureLastUploadedAt:
                settings.profilePicture?.lastUploadedAt !== undefined
                    ? intoUnsignedLong(BigInt(settings.profilePicture.lastUploadedAt.getTime()))
                    : undefined,
            profilePictureShareWith,
        }).finish();
    },
    decode: (encoded) => {
        const decoded = proto.ProfileSettings.decode(encoded);

        return PROFILE_SETTINGS_SCHEMA.parse({
            nickname: decoded.nickname,
            profilePictureShareWith: decoded.profilePictureShareWith,
            profilePicture:
                decoded.profilePictureBlob === undefined
                    ? undefined
                    : {
                          blob: decoded.profilePictureBlob,
                          blobId: decoded.profilePictureBlobId,
                          lastUploadedAt: decoded.profilePictureLastUploadedAt,
                          key: decoded.profilePictureKey,
                      },
        });
    },
} as const;
