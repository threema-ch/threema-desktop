import {type ServerGroup} from '~/common/network/types';
import {bytesToHex} from '~/common/utils/byte';
import {type PropertiesMarked} from '~/common/utils/endpoint';
import {u64ToBytesLe} from '~/common/utils/number';
import {type ServicesForViewModel} from '~/common/viewmodel';

export interface DebugPanelViewModel extends PropertiesMarked {
    readonly deviceGroupIdHex: string;
    readonly deviceGroupIdBin: string;
    readonly deviceIdHex: string;
    readonly deviceIdBin: string;
    readonly d2mDeviceInfo: string;
    readonly d2mGroupInfo: string;
    readonly d2mGroupDevices: string;
    readonly d2mReflectionQueue: string;
    readonly d2mReflectionQueueSequenceNumber: string;
    readonly d2mReflectionProcessingQueue: string;
    readonly serverGroup: ServerGroup;
}

export function getDebugPanelViewModel(services: ServicesForViewModel): DebugPanelViewModel {
    const {endpoint, device} = services;

    const deviceGroupId = device.d2m.dgpk.public;
    const deviceBytesLe = u64ToBytesLe(device.d2m.deviceId);
    const deviceGroupIdHex = bytesToHex(deviceGroupId);
    const deviceGroupIdBin = bytesToHex(deviceGroupId, '\\x');
    const deviceIdHex = bytesToHex(deviceBytesLe);
    const deviceIdBin = bytesToHex(deviceBytesLe, '\\x');

    return endpoint.exposeProperties({
        deviceGroupIdHex,
        deviceGroupIdBin,
        deviceIdHex,
        deviceIdBin,
        d2mDeviceInfo: `dev:${deviceGroupIdBin}:${deviceIdBin}`,
        d2mGroupInfo: `group:${deviceGroupIdBin}`,
        d2mGroupDevices: `groupdev:${deviceGroupIdBin}`,
        d2mReflectionQueue: `rq:${deviceGroupIdBin}:${deviceIdBin}`,
        d2mReflectionQueueSequenceNumber: `rqs:${deviceGroupIdBin}:${deviceIdBin}`,
        d2mReflectionProcessingQueue: `rpq:${deviceGroupIdBin}:${deviceIdBin}`,
        serverGroup: device.serverGroup,
    });
}
