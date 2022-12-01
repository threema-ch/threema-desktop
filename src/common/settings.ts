import * as v from '@badrap/valita';

import {ensurePublicNickname} from '~/common/network/types';

import * as proto from './node/settings/settings';

/**
 * Validation schema for the Profile Settings parameters.
 *
 * @throws {ValitaError} In case validation fails.
 */
const PROFILE_SETTINGS_SCHEMA = v.object({
    // The user's public nickname.
    publicNickname: v.string().map(ensurePublicNickname),
});

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
        encode: (settings) => proto.ProfileSettings.encode(settings).finish(),
        decode: (encoded) => PROFILE_SETTINGS_SCHEMA.parse(proto.ProfileSettings.decode(encoded)),
    },
} as const;
