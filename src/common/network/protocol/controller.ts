import {type ServicesForBackend} from '~/common/backend';
import {type NonceGuard} from '~/common/crypto';
import {type DeviceGroupBoxes} from '~/common/crypto/device-group-keys';
import {ProtocolError} from '~/common/error';
import {type CloseInfo} from '~/common/network';
import type * as protobuf from '~/common/network/protobuf';
import {type ConnectedTaskManager} from '~/common/network/protocol/task/manager';
import {
    type ClientCookie,
    type ClientSequenceNumber,
    type CspDeviceId,
    type CspPayloadBox,
    type D2mChallengeBox,
    type D2mDeviceId,
    type IdentityBytes,
    type ServerCookie,
    type ServerSequenceNumber,
} from '~/common/network/types';
import {type ClientKey, type TemporaryClientKey} from '~/common/network/types/keys';
import {type u32, type u53} from '~/common/types';
import {Delayed} from '~/common/utils/delayed';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {SequenceNumberU64} from '~/common/utils/sequence-number';
import {type AbortListener} from '~/common/utils/signal';
import {MonotonicEnumStore} from '~/common/utils/store';

import {type Layer2Controller} from './layer-2-codec';
import {type Layer3Controller} from './layer-3-codec';
import {type Layer4Controller} from './layer-4-codec';
import {type Layer5Controller} from './layer-5-codec';
import {CspAuthState, D2mAuthState} from './state';

export interface ConnectionHandle {
    readonly closed: Promise<CloseInfo>;
    readonly disconnect: (closeInfo: CloseInfo) => void;
}

interface CspControllerSource {
    readonly nonceGuard: NonceGuard;
    readonly ck: ClientKey;
    readonly tck: TemporaryClientKey;
    readonly identity: IdentityBytes;
    readonly info: string;
    readonly deviceId: CspDeviceId;
    readonly echoRequestIntervalS: u53;
    readonly serverIdleTimeoutS: u53;
    readonly clientIdleTimeoutS: u53;
}

type D2mControllerSource = {
    readonly nonceGuard: NonceGuard;
    readonly deviceId: D2mDeviceId;
    readonly deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy;
    readonly platformDetails: string;
    readonly label: string;
} & Pick<DeviceGroupBoxes, 'dgpk' | 'dgdik'>;

type D2dControllerSource = {
    readonly nonceGuard: NonceGuard;
} & Pick<DeviceGroupBoxes, 'dgrk' | 'dgtsk'>;

class CspController {
    public readonly nonceGuard: NonceGuard;
    public readonly ck: ClientKey;
    public readonly tck: TemporaryClientKey;
    public readonly identity: IdentityBytes;
    public readonly cck: ClientCookie;
    public readonly info: string;
    public readonly deviceId: CspDeviceId;
    public readonly echoRequestIntervalS: u53;
    public readonly serverIdleTimeoutS: u53;
    public readonly clientIdleTimeoutS: u53;
    public readonly ssn: ServerSequenceNumber;
    public readonly csn: ClientSequenceNumber;
    public readonly sck: Delayed<ServerCookie, ProtocolError<'csp'>>;
    public readonly box: Delayed<CspPayloadBox, ProtocolError<'csp'>>;
    public readonly state: MonotonicEnumStore<CspAuthState>;
    public readonly authenticated: ResolvablePromise<void>;

    public constructor(services: Pick<ServicesForBackend, 'crypto'>, source: CspControllerSource) {
        // Generate a cryptographically random client cookie
        const cck = services.crypto.randomBytes(new Uint8Array(16)) as ClientCookie;

        this.nonceGuard = source.nonceGuard;
        this.ck = source.ck;
        this.tck = source.tck;
        this.identity = source.identity;
        this.cck = cck;
        this.info = source.info;
        this.deviceId = source.deviceId;
        this.echoRequestIntervalS = source.echoRequestIntervalS;
        this.serverIdleTimeoutS = source.serverIdleTimeoutS;
        this.clientIdleTimeoutS = source.clientIdleTimeoutS;
        this.ssn = new SequenceNumberU64(0n) as ServerSequenceNumber;
        this.csn = new SequenceNumberU64(0n) as ClientSequenceNumber;
        this.sck = new Delayed(
            () => new ProtocolError('csp', 'Server cookie not yet available'),
            () => new ProtocolError('csp', 'Server cookie already set'),
        );
        this.box = new Delayed(
            () => new ProtocolError('csp', 'Payload crypto box not yet available'),
            () => new ProtocolError('csp', 'Payload crypto box already set'),
        );
        this.state = new MonotonicEnumStore<CspAuthState>(CspAuthState.CLIENT_HELLO);
        this.authenticated = new ResolvablePromise((resolve) =>
            this.state.subscribe((state) => {
                if (state === CspAuthState.COMPLETE) {
                    resolve();
                }
            }),
        );
    }
}

class D2mController implements Pick<DeviceGroupBoxes, 'dgpk' | 'dgdik'> {
    public readonly nonceGuard: NonceGuard;
    public readonly dgpk: DeviceGroupBoxes['dgpk'];
    public readonly dgdik: DeviceGroupBoxes['dgdik'];
    public readonly deviceId: D2mDeviceId;
    public readonly deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy;
    public readonly label: string;
    public readonly platformDetails: string;
    public readonly box: Delayed<D2mChallengeBox, ProtocolError<'d2m'>>;
    public readonly state: MonotonicEnumStore<D2mAuthState>;
    public readonly authenticated: ResolvablePromise<void>;
    public readonly serverInfo: ResolvablePromise<protobuf.validate.d2m.ServerInfo.Type>;
    public readonly promotedToLeader: ResolvablePromise<void>;
    public readonly reflectionQueueDry: ResolvablePromise<void>;
    public readonly protocolVersion: ResolvablePromise<u32>;

    public constructor(source: D2mControllerSource) {
        this.nonceGuard = source.nonceGuard;
        this.dgpk = source.dgpk;
        this.dgdik = source.dgdik;
        this.deviceId = source.deviceId;
        this.deviceSlotExpirationPolicy = source.deviceSlotExpirationPolicy;
        this.label = source.label;
        this.platformDetails = source.platformDetails;
        this.box = new Delayed(
            () => new ProtocolError('d2m', 'Challenge crypto box not yet available'),
            () => new ProtocolError('d2m', 'Challenge crypto box already set'),
        );
        this.state = new MonotonicEnumStore<D2mAuthState>(D2mAuthState.SERVER_HELLO);
        this.authenticated = new ResolvablePromise((resolve) =>
            this.state.subscribe((state) => {
                if (state === D2mAuthState.COMPLETE) {
                    resolve();
                }
            }),
        );
        this.serverInfo = new ResolvablePromise();
        this.promotedToLeader = new ResolvablePromise();
        this.reflectionQueueDry = new ResolvablePromise();
        this.protocolVersion = new ResolvablePromise();
    }
}

class D2dController implements Pick<DeviceGroupBoxes, 'dgrk' | 'dgtsk'> {
    public readonly nonceGuard: NonceGuard;
    public readonly dgrk: DeviceGroupBoxes['dgrk'];
    public readonly dgtsk: DeviceGroupBoxes['dgtsk'];

    public constructor(source: D2dControllerSource) {
        this.nonceGuard = source.nonceGuard;
        this.dgrk = source.dgrk;
        this.dgtsk = source.dgtsk;
    }
}

export class ProtocolController {
    public readonly csp: CspController;
    public readonly d2m: D2mController;
    public readonly d2d: D2dController;

    public constructor(
        services: Pick<ServicesForBackend, 'crypto'>,
        public readonly taskManager: ConnectedTaskManager,
        public readonly connection: Delayed<ConnectionHandle>,
        public readonly signal: AbortListener,
        csp: CspControllerSource,
        d2m: D2mControllerSource,
        d2d: D2dControllerSource,
    ) {
        this.csp = new CspController(services, csp);
        this.d2m = new D2mController(d2m);
        this.d2d = new D2dController(d2d);
    }

    public forLayer2(): Layer2Controller {
        return {
            csp: this.csp.state,
        };
    }

    public forLayer3(): Layer3Controller {
        return this;
    }

    public forLayer4(): Layer4Controller {
        return this;
    }

    public forLayer5(): Layer5Controller {
        return this;
    }
}
