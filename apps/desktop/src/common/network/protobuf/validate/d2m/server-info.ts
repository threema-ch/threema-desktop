import * as v from '@badrap/valita';
import {d2m} from '@threema/protocol/protobuf';
import {unixTimestampToDateMs} from '@threema/ts-utils/conversion/unix-timestamp-to-date-ms';

import {DeviceSlotStateUtils} from '~/common/enum';
import {validator} from '~/common/network/protobuf/utils';
import {instanceOf, unsignedLongAsU64} from '~/common/utils/valita-helpers';

export const SCHEMA = validator(
    d2m.ServerInfo,
    v
        .object({
            currentTime: unsignedLongAsU64().map(unixTimestampToDateMs),
            maxDeviceSlots: v.number(),
            deviceSlotState: v.number().map((value) => DeviceSlotStateUtils.fromNumber(value)),
            encryptedSharedDeviceData: instanceOf(Uint8Array),
            reflectionQueueLength: v.number(),
        })
        .rest(v.unknown()),
);

export type Type = v.Infer<typeof SCHEMA>;
