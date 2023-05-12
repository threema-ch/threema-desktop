import {type RendezvousProtocolSetup} from '~/common/dom/network/protocol/rendezvous';
import * as protobuf from '~/common/network/protobuf';
import {UNIT_MESSAGE} from '~/common/network/protobuf';
import {type ReadonlyUint8Array} from '~/common/types';
import {u8aToBase64} from '~/common/utils/base64';
import {type QueryablePromise} from '~/common/utils/resolvable-promise';

export interface LinkingParams {
    /**
     * Information required to show the linking QR code.
     */
    readonly setup: RendezvousProtocolSetup;

    /**
     * Promise that will resolve as soon as the WebSocket connection is established. If the
     * connection fails, this promise will be rejected.
     */
    readonly connected: QueryablePromise<void>;

    /**
     * Promise that will resolve with the Rendezvous Path Hash (RPH) once the connection is
     * established (including nomination).
     */
    readonly nominated: QueryablePromise<ReadonlyUint8Array>;
}

export type ProcessStep =
    | 'scan'
    | 'confirmEmoji'
    // | 'enterNewPassword'
    // | 'syncing'
    | 'successLinked'
    | 'error';

export type ConnectionState = 'connecting' | 'waiting-for-handshake' | 'nominated' | 'failed';

export interface LinkingState {
    readonly currentStep: ProcessStep;
    readonly connectionState: ConnectionState;
    readonly rendzevousPathHash?: ReadonlyUint8Array;
}

/**
 * Payload to be encoded in a QR code.
 */
export function getLinkingQrCodePayload(setup: LinkingParams['setup']): string {
    // Construct a Protobuf DeviceGroupJoinRequestOrOffer
    const version = protobuf.url.DeviceGroupJoinRequestOrOffer.Version.V1_0;
    const variant = protobuf.utils.creator(protobuf.url.DeviceGroupJoinRequestOrOffer.Variant, {
        requestToJoin: UNIT_MESSAGE,
        offerToJoin: undefined,
    });
    const relayedWebSocket = protobuf.utils.creator(
        protobuf.rendezvous.RendezvousInit.RelayedWebSocket,
        {
            pathId: setup.relayedWebSocket.pathId,
            networkCost: protobuf.rendezvous.RendezvousInit.NetworkCost.UNKNOWN,
            url: setup.relayedWebSocket.url,
        },
    );
    const rendezvousInit = protobuf.utils.creator(protobuf.rendezvous.RendezvousInit, {
        version: protobuf.rendezvous.RendezvousInit.Version.V1_0,
        ak: setup.ak.unwrap() as Uint8Array, // TODO(DESK-1037): Better way?
        relayedWebSocket,
        directTcpServer: undefined,
    });
    const joinRequest = protobuf.utils.creator(protobuf.url.DeviceGroupJoinRequestOrOffer, {
        version,
        variant,
        rendezvousInit,
    });

    // Encode request into base64 bytes
    const bytes = protobuf.url.DeviceGroupJoinRequestOrOffer.encode(joinRequest).finish();
    const urlSafeBase64 = u8aToBase64(bytes, {urlSafe: true});
    return `threema://device-group/join#${urlSafeBase64}`;
}
