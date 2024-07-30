import * as protobuf from '~/common/network/protobuf';
import {
    D2mPayloadType,
    type InboundDropDeviceLayerMessage,
    type OutboundDropDeviceLayerMessage,
} from '~/common/network/protocol';
import type {RawCaptureHandler} from '~/common/network/protocol/capture';
import type {ConnectionController} from '~/common/network/protocol/controller';
import type {D2mDeviceId} from '~/common/network/types';
import type {
    AsyncCodecSource,
    SinkCodecController,
    SourceCodecController,
    AsyncCodecSink,
} from '~/common/utils/codec';
import {intoUnsignedLong} from '~/common/utils/number';
import {eternalPromise} from '~/common/utils/promise';

export interface DropDeviceLayerController {
    readonly connection: Pick<ConnectionController, 'current'>;
    readonly d2m: {
        readonly deviceId: D2mDeviceId;
        readonly authenticated: Promise<void>;
    };
}

export class DropDeviceLayerDecoder implements AsyncCodecSink<InboundDropDeviceLayerMessage> {
    public constructor(private readonly _capture?: RawCaptureHandler) {}

    // eslint-disable-next-line @typescript-eslint/require-await
    public async write(
        message: InboundDropDeviceLayerMessage,
        controller: SinkCodecController,
    ): Promise<void> {
        this._capture?.(message, {info: message.payload.constructor.name});

        // Do nothing as we do not want to forward nor work with any message here.
    }

    public close(): void {
        // Nothing to do here
    }

    public abort(reason: Error): void {
        throw reason;
    }
}

export class DropDeviceLayerEncoder implements AsyncCodecSource<OutboundDropDeviceLayerMessage> {
    private readonly _capture?: RawCaptureHandler;
    public constructor(
        private readonly _controller: DropDeviceLayerController,

        capture?: RawCaptureHandler,
    ) {
        this._capture = capture;
    }

    public async pull(
        controller: SourceCodecController<OutboundDropDeviceLayerMessage>,
    ): Promise<void> {
        const {d2m} = this._controller;
        await d2m.authenticated;

        const message: OutboundDropDeviceLayerMessage = {
            type: D2mPayloadType.DROP_DEVICE,
            payload: protobuf.utils.encoder(protobuf.d2m.DropDevice, {
                deviceId: intoUnsignedLong(this._controller.d2m.deviceId),
            }),
        };
        this._capture?.(message, {info: 'Unknown (TODO)'});
        controller.enqueue(message);

        // We sent the only message to be sent, now wait until the connection is terminated
        await eternalPromise();
    }

    public cancel(reason: Error): void {
        throw reason;
    }
}
