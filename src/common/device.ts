import {type ServicesForBackend} from '~/common/backend';
import {deriveDeviceGroupKeys, type DeviceGroupBoxes} from '~/common/crypto/device-group-keys';
import {type DatabaseBackend} from '~/common/db';
import {
    type CspDeviceId,
    type D2mDeviceId,
    type IdentityString,
    type ServerGroup,
} from '~/common/network/types';
import {type ClientKey, type RawDeviceGroupKey} from '~/common/network/types/keys';
import {Identity} from '~/common/utils/identity';

/**
 * Services required by the device backend.
 */
export type ServicesForDevice = Pick<ServicesForBackend, 'crypto' | 'logging' | 'nonces'> & {
    db: DatabaseBackend;
};

export interface CspData {
    readonly ck: ClientKey;
    readonly deviceId: CspDeviceId;
}

export type D2mData = {
    readonly deviceId: D2mDeviceId;
} & Pick<DeviceGroupBoxes, 'dgpk' | 'dgdik'>;

export type D2dData = Pick<DeviceGroupBoxes, 'dgrk' | 'dgsddk' | 'dgtsk'>;

export interface Device {
    readonly identity: Identity;
    readonly serverGroup: ServerGroup;
    readonly csp: CspData;
    readonly d2m: D2mData;
    readonly d2d: D2dData;
}

/**
 * The core data tied to a Threema Id: The identity, the client key and the directory-assigned
 * server group.
 */
export interface IdentityData {
    readonly identity: IdentityString;
    readonly ck: ClientKey;
    readonly serverGroup: ServerGroup;
}

/**
 * IDs to identify a device towards the Mediator Server and the Chat Server.
 */
export interface DeviceIds {
    readonly d2mDeviceId: D2mDeviceId;
    readonly cspDeviceId: CspDeviceId;
}

export class DeviceBackend implements Device {
    public readonly identity: Identity;
    public readonly serverGroup: ServerGroup;
    public readonly csp: CspData;
    public readonly d2m: D2mData;
    public readonly d2d: D2dData;

    public constructor(
        services: ServicesForDevice,
        identityData: IdentityData,
        deviceIds: DeviceIds,
        dgk: RawDeviceGroupKey,
    ) {
        const {crypto, nonces} = services;

        // Derive all device group keys and purge DGK from memory
        const boxes = deriveDeviceGroupKeys(crypto, dgk, nonces);
        dgk.purge();

        this.identity = new Identity(identityData.identity);
        this.serverGroup = identityData.serverGroup;
        this.csp = {
            ck: identityData.ck,
            deviceId: deviceIds.cspDeviceId,
        };
        this.d2m = {
            deviceId: deviceIds.d2mDeviceId,
            dgpk: boxes.dgpk,
            dgdik: boxes.dgdik,
        };
        this.d2d = {
            dgrk: boxes.dgrk,
            dgsddk: boxes.dgsddk,
            dgtsk: boxes.dgtsk,
        };
    }
}
