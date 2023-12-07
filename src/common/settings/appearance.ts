import * as v from '@badrap/valita';

import {InactiveContactsPolicyUtils, TimeFormatUtils} from '~/common/enum';
import * as proto from '~/common/node/settings/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {optionalEnum} from '~/common/utils/valita-helpers';

const APPEARANCE_SETTINGS_SCHEMA = v.object({
    timeFormat: optionalEnum(TimeFormatUtils),
    inactiveContactsPolicy: optionalEnum(InactiveContactsPolicyUtils),
});

export type AppearanceSettings = v.Infer<typeof APPEARANCE_SETTINGS_SCHEMA>;

export const APPEARANCE_SETTINGS_CODEC: SettingsCategoryCodec<'appearance'> = {
    encode: (settings) =>
        proto.AppearanceSettings.encode({
            timeFormat: settings.timeFormat,
            inactiveContactsPolicy: settings.inactiveContactsPolicy,
        }).finish(),
    decode: (encoded) => APPEARANCE_SETTINGS_SCHEMA.parse(proto.AppearanceSettings.decode(encoded)),
} as const;
