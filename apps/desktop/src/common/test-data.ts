import * as v from '@badrap/valita';
import type {ClientInfo} from '@threema/libthreema-wasm';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {hexToBytes} from '@threema/ts-utils/conversion/hex-to-bytes';
import {ensureU8} from '@threema/ts-utils/integer/u8';

import type {LoggerFactory} from '~/common/logging';
import {IdentityCreateTask} from '~/common/network/protocol/task/libthreema/identity-create';
import {
    ensureCspDeviceId,
    ensureD2mDeviceId,
    ensureDeviceCookie,
    ensureIdentityString,
    ensureServerGroup,
} from '~/common/network/types';
import {assert} from '~/common/utils/assert';

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
        workData: v.object({username: v.string(), password: v.string()}).optional(),
        oppfUrl: v.string().optional(),
        oppFile: v.string().optional(),
    })
    .rest(v.unknown());

export type TestDataJson = Readonly<v.Infer<typeof TEST_DATA_JSON_SCHEMA>>;

export function parseTestData(data: string): TestDataJson {
    return TEST_DATA_JSON_SCHEMA.parse(JSON.parse(data));
}

export async function generateTestData(
    clientInfo: ClientInfo,
    logging: LoggerFactory,
): Promise<TestDataJson> {
    assert(
        import.meta.env.BUILD_FLAVOR === 'consumer-sandbox',
        'Test data generation is permitted only on consumer-sandbox.',
    );

    const task = new IdentityCreateTask(clientInfo, logging);
    const identity = await task.run();

    const serverGroup = ensureServerGroup(
        bytesToHex(Uint8Array.of(ensureU8(identity.serverGroup))),
    );

    return {
        profile: {
            identity: ensureIdentityString(identity.userIdentity),
            keyStoragePassword: 'CHANGE_ME',
            privateKey: bytesToHex(identity.clientKey),
        },
        serverGroup,
        deviceIds: {
            d2mDeviceId: ensureD2mDeviceId(123n),
            cspDeviceId: ensureCspDeviceId(567n),
        },

        deviceCookie: ensureDeviceCookie(new Uint8Array(16)),
    };
}
