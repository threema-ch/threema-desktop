import * as v from '@badrap/valita';

import {DeviceSlotStateUtils} from '~/common/enum';
import {d2m} from '~/common/network/protobuf/js';
import {validator} from '~/common/network/protobuf/utils';
import {unixTimestampToDateMs} from '~/common/utils/number';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    d2m.ServerInfo,
    v
        .object({
            currentTime: unsignedLongAsU64().map(unixTimestampToDateMs),
            maxDeviceSlots: v.number(),
            deviceSlotState: v.number().map((value) => DeviceSlotStateUtils.fromNumber(value)),
            encryptedSharedDeviceData: instanceOf(Uint8Array),
            reflectionQueueLength: v.number().optional(),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
