import * as v from '@badrap/valita';

import type {AutoDownload} from '~/common/model/settings/media';
import * as proto from '~/common/node/settings/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {unreachable} from '~/common/utils/assert';

export const RESTRICTED_DOWNLOAD_SIZE_IN_MB = 10;

function simplifyAutoDownload(
    autoDownload: proto.MediaSettings_AutoDownload,
): AutoDownload | undefined {
    if (autoDownload.policy === undefined) {
        return undefined;
    }

    switch (autoDownload.policy.$case) {
        case 'off':
            return {on: false};
        case 'on':
            return {on: true, limitInMb: autoDownload.policy.on.limitInMb};

        default:
            return unreachable(autoDownload.policy);
    }
}

const MEDIA_SETTINGS_SCHEMA = v
    .object({
        autoDownload: v.record().map(simplifyAutoDownload).default<AutoDownload>({on: false}),
    })
    .rest(v.unknown());

export type MediaSettings = v.Infer<typeof MEDIA_SETTINGS_SCHEMA>;

export const MEDIA_SETTINGS_CODEC: SettingsCategoryCodec<'media'> = {
    encode: (settings) => {
        // Convert `settings.autoDownload` to its protobuf representation
        let autoDownload: proto.MediaSettings['autoDownload'];
        if (settings.autoDownload.on) {
            autoDownload = {
                policy: {
                    $case: 'on',
                    on: {
                        on: proto.Unit,
                        limitInMb: settings.autoDownload.limitInMb,
                    },
                },
            };
        } else {
            autoDownload = {policy: {$case: 'off', off: proto.Unit}};
        }

        return proto.MediaSettings.encode({
            autoDownload,
        }).finish();
    },
    decode: (encoded) => MEDIA_SETTINGS_SCHEMA.parse(proto.MediaSettings.decode(encoded)),
} as const;
