import type {MediatorPipe, MediatorTransport} from '~/common/dom/network';
import {type BidirectionalStream, TransformStream} from '~/common/dom/streams';
import {ProtocolError} from '~/common/error';
import {CloseCode, type CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import type {ServerGroup} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {bytesToHex} from '~/common/utils/byte';
import type {AsyncTransformerCodec, TransformerCodecController} from '~/common/utils/codec';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';

import {createWebSocketStream, type WebSocketEventWrapperStreamOptions} from './websocket';

interface MediatorWebSocketTransportContext {
    url: string;
    deviceGroupId: ReadonlyUint8Array;
    serverGroup: ServerGroup;
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
            stream: BidirectionalStream<ArrayBuffer, BufferSource>,
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
        this._ws = createWebSocketStream(`${info.url}/${clientUrlInfo}`, options);
        this.closed = ResolvablePromise.wrap(
            this._ws.closed.then(({code, reason}) => ({
                code: code ?? CloseCode.INTERNAL_ERROR,
                reason,
                origin: 'remote',
            })),
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
            stream: BidirectionalStream<ArrayBuffer, BufferSource>,
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
