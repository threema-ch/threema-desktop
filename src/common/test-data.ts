import * as v from '@badrap/valita';

import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureDeviceCookie,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {hexToBytes} from '~/common/utils/byte';

export const TEST_DATA_JSON_SCHEMA = v
    .object({
        profile: v.object({
            identity: v.string().map(ensureIdentityString),
            keyStoragePassword: v.string(),
            privateKey: v.string(),
        }),
        serverGroup: v.string().map(ensureServerGroup),
        deviceIds: v.object({
            d2mDeviceId: v.number().map(BigInt).map(ensureD2mDeviceId),
            cspDeviceId: v.number().map(BigInt).map(ensureCspDeviceId),
        }),
        deviceCookie: v.string().map(hexToBytes).map(ensureDeviceCookie),
    })
    .rest(v.unknown());

export type TestDataJson = Readonly<v.Infer<typeof TEST_DATA_JSON_SCHEMA>>;

export function parseTestData(data: string): TestDataJson {
    return TEST_DATA_JSON_SCHEMA.parse(JSON.parse(data));
}
