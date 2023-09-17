import * as v from '@badrap/valita';

import {CallConnectionPolicyUtils, CallPolicyUtils} from '~/common/enum';
import * as proto from '~/common/node/settings/settings';
import type {SettingsCategoryCodec} from '~/common/settings';
import {optionalEnum} from '~/common/utils/valita-helpers';

const CALLS_SETTINGS_SCHEMA = v
    .object({
        callPolicy: optionalEnum(CallPolicyUtils),
        callConnectionPolicy: optionalEnum(CallConnectionPolicyUtils),
    })
    .rest(v.unknown());

/**
 * Validated calls settings.
 */
export type CallsSettings = v.Infer<typeof CALLS_SETTINGS_SCHEMA>;

export const CALLS_SETTINGS_CODEC: SettingsCategoryCodec<'calls'> = {
    encode: (settings) =>
        proto.CallsSettings.encode({
            callPolicy: settings.callPolicy,
            callConnectionPolicy: settings.callConnectionPolicy,
        }).finish(),
    decode: (encoded) => CALLS_SETTINGS_SCHEMA.parse(proto.CallsSettings.decode(encoded)),
} as const;
