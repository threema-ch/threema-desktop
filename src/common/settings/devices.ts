import * as v from '@badrap/valita';

import * as proto from '~/common/internal-protobuf/settings';
import {ensureDeviceName} from '~/common/network/types';
import type {SettingsCategoryCodec} from '~/common/settings';

const DEVICES_SETTINGS_SCHEMA = v
    .object({
        deviceName: v.string().map(ensureDeviceName).optional(),
    })
    .rest(v.unknown());

export type DeviceSettings = v.Infer<typeof DEVICES_SETTINGS_SCHEMA>;

export const DEVICES_SETTINGS_CODEC: SettingsCategoryCodec<'devices'> = {
    encode: (settings) =>
        proto.DevicesSettings.encode({
            deviceName: settings.deviceName,
        }).finish(),
    decode: (encoded) => DEVICES_SETTINGS_SCHEMA.parse(proto.DevicesSettings.decode(encoded)),
} as const;
