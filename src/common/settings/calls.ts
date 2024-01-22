import * as v from '@badrap/valita';

import {O2oCallConnectionPolicyUtils, O2oCallPolicyUtils} from '~/common/enum';
import * as proto from '~/common/node/settings/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {optionalEnum} from '~/common/utils/valita-helpers';

const CALLS_SETTINGS_SCHEMA = v
    .object({
        o2oCallPolicy: optionalEnum(O2oCallPolicyUtils),
        o2oCallConnectionPolicy: optionalEnum(O2oCallConnectionPolicyUtils),
    })
    .rest(v.unknown());

/**
 * Validated calls settings.
 */
export type CallsSettings = v.Infer<typeof CALLS_SETTINGS_SCHEMA>;

export const CALLS_SETTINGS_CODEC: SettingsCategoryCodec<'calls'> = {
    encode: (settings) =>
        proto.CallsSettings.encode({
            o2oCallPolicy: settings.o2oCallPolicy,
            o2oCallConnectionPolicy: settings.o2oCallConnectionPolicy,
        }).finish(),
    decode: (encoded) => CALLS_SETTINGS_SCHEMA.parse(proto.CallsSettings.decode(encoded)),
} as const;
