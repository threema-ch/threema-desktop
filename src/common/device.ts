import {type ServicesForBackend} from '~/common/backend';
import {type NonceGuard} from '~/common/crypto';
import {type DeviceGroupBoxes, deriveDeviceGroupKeys} from '~/common/crypto/device-group-keys';
import {type DatabaseBackend} from '~/common/db';
import {
    type CspDeviceId,
    type CspNonceGuard,
    type D2mDeviceId,
    type D2xNonceGuard,
    type IdentityString,
    type ServerGroup,
} from '~/common/network/types';
import {type ClientKey, type RawDeviceGroupKey} from '~/common/network/types/keys';
import {Identity} from '~/common/utils/identity';

/**
 * Services required by the device backend.
 */
export type ServicesForDevice = Pick<ServicesForBackend, 'crypto' | 'logging'> & {
    db: DatabaseBackend;
};

export interface CspData {
    readonly ck: ClientKey;
    readonly deviceId: CspDeviceId;
    readonly nonceGuard: CspNonceGuard;
}

export type D2mData = {
    readonly deviceId: D2mDeviceId;
    readonly nonceGuard: NonceGuard;
} & Pick<DeviceGroupBoxes, 'dgpk' | 'dgdik'>;

export type D2dData = {
    readonly nonceGuard: NonceGuard;
} & Pick<DeviceGroupBoxes, 'dgrk' | 'dgsddk' | 'dgtsk'>;

export interface Device {
    readonly identity: Identity;
    readonly serverGroup: ServerGroup;
    readonly csp: CspData;
    readonly d2m: D2mData;
    readonly d2d: D2dData;
}

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
        identityData: {identity: IdentityString; ck: ClientKey; serverGroup: ServerGroup},
        deviceIds: DeviceIds,
        dgk: RawDeviceGroupKey,
    ) {
        const {crypto} = services;

        // Get D2X nonce guard
        const d2xNonceGuard = {
            use: (): void => {
                // TODO(WEBMD-379): Add D2X nonce guard
                // eslint-disable-next-line @typescript-eslint/no-empty-function
            },
        } as NonceGuard as D2xNonceGuard;

        // Derive all device group keys and purge DGK from memory
        const boxes = deriveDeviceGroupKeys(crypto, dgk, d2xNonceGuard);
        dgk.purge();

        this.identity = new Identity(identityData.identity);
        this.serverGroup = identityData.serverGroup;
        this.csp = {
            ck: identityData.ck,
            deviceId: deviceIds.cspDeviceId,
            nonceGuard: {
                use: (): void => {
                    // TODO(WEBMD-379): Add CSP nonce guard
                    // eslint-disable-next-line @typescript-eslint/no-empty-function
                },
            } as NonceGuard as CspNonceGuard,
        };
        this.d2m = {
            deviceId: deviceIds.d2mDeviceId,
            nonceGuard: d2xNonceGuard,
            dgpk: boxes.dgpk,
            dgdik: boxes.dgdik,
        };
        this.d2d = {
            nonceGuard: d2xNonceGuard,
            dgrk: boxes.dgrk,
            dgsddk: boxes.dgsddk,
            dgtsk: boxes.dgtsk,
        };
    }
}
