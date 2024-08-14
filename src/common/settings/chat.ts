import * as v from '@badrap/valita';

import {ComposeBarEnterModeUtils} from '~/common/enum';
import * as proto from '~/common/internal-protobuf/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {optionalEnum} from '~/common/utils/valita-helpers';

const CHAT_SETTINGS_SCHEMA = v
    .object({
        composeBarEnterMode: optionalEnum(ComposeBarEnterModeUtils),
    })
    .rest(v.unknown());

export type ChatSettings = v.Infer<typeof CHAT_SETTINGS_SCHEMA>;

export const CHAT_SETTINGS_CODEC: SettingsCategoryCodec<'chat'> = {
    encode: (settings) =>
        proto.ChatSettings.encode({
            composeBarEnterMode: settings.composeBarEnterMode,
        }).finish(),
    decode: (encoded) => CHAT_SETTINGS_SCHEMA.parse(proto.ChatSettings.decode(encoded)),
} as const;
