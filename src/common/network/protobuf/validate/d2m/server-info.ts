import * as v from '@badrap/valita';
import Long from 'long';

import {DeviceSlotStateUtils} from '~/common/enum';
import {d2m} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {intoU64, unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    d2m.ServerInfo,
    v
        .object({
            currentTime: instanceOf(Long).map(intoU64).map(unixTimestampToDateMs),
            maxDeviceSlots: v.number(),
            deviceSlotState: v.number().map(DeviceSlotStateUtils.fromNumber),
            encryptedSharedDeviceData: instanceOf(Uint8Array),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
