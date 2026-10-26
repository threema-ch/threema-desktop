import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {AsyncTransformerCodec} from '@threema/ts-utils/codec/async-transformer-codec';
import type {TransformerCodecController} from '@threema/ts-utils/codec/transformer-codec-controller';
import {bytesToHex} from '@threema/ts-utils/conversion/bytes-to-hex';
import {ResolvablePromise} from '@threema/ts-utils/promise/resolvable-promise';

import type {MediatorPipe, MediatorTransport} from '~/common/dom/network';
import {type BidirectionalStream, TransformStream} from '~/common/dom/streams';
import {ProtocolError} from '~/common/error';
import {CloseCode, type CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import type {BaseUrl, ServerGroup} from '~/common/network/types';

import {createWebSocketStream, type WebSocketEventWrapperStreamOptions} from './websocket';

interface MediatorWebSocketTransportContext {
    readonly baseUrl: BaseUrl;
    readonly deviceGroupId: ReadonlyUint8Array;
    readonly serverGroup: ServerGroup;
}

/**
 * Ensures that inbound messages are binary.
 */
class WebSocketEnsureBinaryValidator
    implements AsyncTransformerCodec<ArrayBuffer | string, ArrayBuffer>
{
    public transform(
        message: ArrayBuffer | string,
        controller: TransformerCodecController<ArrayBuffer>,
    ): void {
        // Ensure it's binary
        if (!(message instanceof ArrayBuffer)) {
            throw new ProtocolError(
                'd2m',
                `Unexpected inbound message type: ${message.constructor.name}`,
            );
        }

        // Enqueue as is
        controller.enqueue(message);
    }
}

/**
 * Mediator server transport using WebSocket.
 */
export class MediatorWebSocketTransport implements MediatorTransport {
    public readonly pipe: Promise<MediatorPipe>;
    public readonly closed: ResolvablePromise<CloseInfo>;
    private readonly _ws: WebSocketStream;

    public constructor(
        info: MediatorWebSocketTransportContext,
        options: WebSocketEventWrapperStreamOptions,
        applyMediatorStreamPipeline: (
            stream: BidirectionalStream<ArrayBuffer, AllowSharedBufferSource>,
        ) => MediatorPipe,
    ) {
        // Encode `ClientUrlInfo` to hex
        const clientUrlInfo = bytesToHex(
            protobuf.d2m.ClientUrlInfo.encode(
                protobuf.utils.creator(protobuf.d2m.ClientUrlInfo, {
                    deviceGroupId: info.deviceGroupId as Uint8Array,
                    serverGroup: info.serverGroup,
                }),
            ).finish(),
        );

        // Initiate connection
        this._ws = createWebSocketStream(new URL(clientUrlInfo, info.baseUrl), options);
        this.closed = ResolvablePromise.wrap(
            this._ws.closed.then(({code, reason}) => ({
                code: code ?? CloseCode.INTERNAL_ERROR,
                reason,
                origin: 'remote',
            })),
            {uncaught: 'discard'},
        );

        // Create connection and apply pipeline
        this.pipe = this._createConnection(applyMediatorStreamPipeline);
    }

    public close(info: CloseInfo): void {
        this.closed.resolve(info);
        this._ws.close(info);
    }

    private async _createConnection(
        applyMediatorStreamPipeline: (
            stream: BidirectionalStream<ArrayBuffer, AllowSharedBufferSource>,
        ) => MediatorPipe,
    ): Promise<MediatorPipe> {
        // Wait until the underlying WebSocket is connected
        const connection = await this._ws.connection;

        // Apply the pipeline
        return applyMediatorStreamPipeline({
            // Ensure binary for inbound messages
            readable: connection.readable.pipeThrough(
                new TransformStream(new WebSocketEnsureBinaryValidator()),
            ),

            // No need to modify the outbound stream
            writable: connection.writable,
        });
    }
}
