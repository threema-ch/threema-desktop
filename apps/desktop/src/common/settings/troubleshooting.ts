import * as v from '@badrap/valita';

import {CallStatisticsPolicyUtils} from '~/common/enum';
import * as proto from '~/common/internal-protobuf/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {optionalEnum} from '~/common/utils/valita-helpers';

const TROUBLESHOOTING_SETTINGS_SCHEMA = v
    .object({
        callStatisticsPolicy: optionalEnum(CallStatisticsPolicyUtils),
    })
    .rest(v.unknown());

/**
 * Validated troubleshooting settings.
 */
export type TroubleshootingSettings = v.Infer<typeof TROUBLESHOOTING_SETTINGS_SCHEMA>;

export const TROUBLESHOOTING_SETTINGS_CODEC: SettingsCategoryCodec<'troubleshooting'> = {
    encode: (settings) =>
        proto.TroubleshootingSettings.encode({
            callStatisticsPolicy: settings.callStatisticsPolicy,
        }).finish(),
    decode: (encoded) =>
        TROUBLESHOOTING_SETTINGS_SCHEMA.parse(proto.TroubleshootingSettings.decode(encoded)),
} as const;
