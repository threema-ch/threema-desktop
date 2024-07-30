import type {ServicesForBackend} from '~/common/backend';
import type {MediatorPipe} from '~/common/dom/network';
import {
    type BidirectionalStream,
    ReadableStream,
    TransformStream,
    WritableStream,
} from '~/common/dom/streams';
import type {
    InboundDropDeviceLayerMessage,
    InboundL1Message,
    InboundL2Message,
    InboundL3Message,
    InboundL4Message,
    OutboundDropDeviceLayerMessage,
    OutboundL2Message,
    OutboundL3Message,
    OutboundL4Message,
} from '~/common/network/protocol';
import type {RawCaptureHandlerPair, RawCaptureHandlers} from '~/common/network/protocol/capture';
import {
    DropDeviceLayerDecoder,
    DropDeviceLayerEncoder,
    type DropDeviceLayerController,
} from '~/common/network/protocol/drop-device-layer-codec';
import {Layer1Decoder, Layer1Encoder} from '~/common/network/protocol/layer-1-codec';
import {type Layer2Controller, Layer2Decoder} from '~/common/network/protocol/layer-2-codec';
import {
    type Layer3Controller,
    Layer3Decoder,
    Layer3Encoder,
} from '~/common/network/protocol/layer-3-codec';
import {
    type Layer4Controller,
    Layer4Decoder,
    Layer4Encoder,
} from '~/common/network/protocol/layer-4-codec';
import {
    type Layer5Controller,
    Layer5Decoder,
    Layer5Encoder,
} from '~/common/network/protocol/layer-5-codec';
import {CspAuthStateUtils, D2mAuthStateUtils} from '~/common/network/protocol/state';
import {unwrap} from '~/common/utils/assert';
import type {
    TransformerCodecController,
    AsyncTransformerCodec,
    SyncTransformerCodec,
} from '~/common/utils/codec';
import {Delayed} from '~/common/utils/delayed';
import type {TimerCanceller} from '~/common/utils/timer';

/**
 * See `layer-1-codec.ts` for docs.
 */
class Layer1Codec {
    public readonly decoder: Layer1Decoder;
    public readonly encoder: Layer1Encoder;

    public constructor(services: ServicesForBackend, capture?: RawCaptureHandlerPair) {
        this.decoder = new Layer1Decoder(services, capture?.inbound);
        this.encoder = new Layer1Encoder(services, capture?.outbound);
    }
}

/**
 * See `layer-2-codec.ts` for docs.
 */
export class Layer2Codec {
    public readonly decoder: Layer2Decoder;

    public constructor(
        services: ServicesForBackend,
        controller: Layer2Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        this.decoder = new Layer2Decoder(controller, capture?.inbound);
    }
}

/**
 * See `layer-3-codec.ts` for docs.
 */
class Layer3Codec<TType extends 'full' | 'd2m-only'> {
    public readonly decoder: Layer3Decoder<TType>;
    public readonly encoder: Layer3Encoder<TType>;

    public constructor(
        services: ServicesForBackend,
        controller: Layer3Controller,
        private readonly _type: TType,
        capture?: RawCaptureHandlerPair,
    ) {
        const log = services.logging.logger('network.pipeline.l3');
        log.debug('Initial CSP auth state:', CspAuthStateUtils.NAME_OF[controller.csp.state.get()]);
        log.debug('Initial D2M auth state:', D2mAuthStateUtils.NAME_OF[controller.d2m.state.get()]);
        const delayed = Delayed.simple<{readonly forward: (message: OutboundL2Message) => void}>(
            'L3 encoder',
        );

        this.decoder = new Layer3Decoder(
            services,
            controller,
            delayed,
            this._type,
            capture?.inbound,
        );
        this.encoder = new Layer3Encoder(
            services,
            controller,
            delayed,
            this._type,
            capture?.outbound,
        );
    }
}

/**
 * See `layer-4-codec.ts` for docs.
 */
class Layer4Codec {
    public readonly decoder: Layer4Decoder;
    public readonly encoder: Layer4Encoder;

    public constructor(
        services: ServicesForBackend,
        controller: Layer4Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        const delayed = Delayed.simple<{readonly forward: (message: OutboundL3Message) => void}>(
            'L4 encoder',
        );
        const ongoingEchoRequests: TimerCanceller[] = [];
        this.decoder = new Layer4Decoder(
            services,
            controller,
            delayed,
            ongoingEchoRequests,
            capture?.inbound,
        );
        this.encoder = new Layer4Encoder(
            services,
            controller,
            delayed,
            ongoingEchoRequests,
            capture?.outbound,
        );
    }
}

/**
 * See `layer-5-codec.ts` for docs.
 */
class Layer5Codec {
    public readonly decoder: WritableStream<InboundL4Message>;
    public readonly encoder: ReadableStream<OutboundL4Message>;

    public constructor(
        services: ServicesForBackend,
        controller: Layer5Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        this.decoder = new WritableStream(new Layer5Decoder(controller, capture?.inbound));
        this.encoder = new ReadableStream(new Layer5Encoder(controller, capture?.outbound));
    }
}

class DropDeviceLayerCodec {
    public readonly decoder: WritableStream<InboundDropDeviceLayerMessage>;
    public readonly encoder: ReadableStream<OutboundDropDeviceLayerMessage>;

    public constructor(
        services: ServicesForBackend,
        controller: DropDeviceLayerController,
        capture?: RawCaptureHandlerPair,
    ) {
        this.decoder = new WritableStream(new DropDeviceLayerDecoder(capture?.inbound));
        this.encoder = new ReadableStream(
            new DropDeviceLayerEncoder(controller, capture?.outbound),
        );
    }
}

/**
 * A Transform stream adapter that chains the synchronous decoder transform streams L1 through L4
 * together and exposes it as a single asynchronous transform stream.
 */
class Layer1Through4DecoderTransformStreamAdapter
    implements AsyncTransformerCodec<ArrayBuffer, InboundL4Message>
{
    private readonly _layer1: {
        codec: SyncTransformerCodec<ArrayBuffer, InboundL1Message>;
        forward: (message: InboundL1Message) => void;
    };
    private readonly _layer2: {
        codec: SyncTransformerCodec<InboundL1Message, InboundL2Message>;
        forward: (message: InboundL2Message) => void;
    };
    private readonly _layer3: {
        codec: SyncTransformerCodec<InboundL2Message, InboundL3Message>;
        forward: (message: InboundL3Message) => void;
    };
    private readonly _layer4: {
        codec: SyncTransformerCodec<InboundL3Message, InboundL4Message>;
        forward: (message: InboundL4Message) => void;
    };
    private _controller: TransformerCodecController<InboundL4Message> | undefined = undefined;

    public constructor(
        layer1: SyncTransformerCodec<ArrayBuffer, InboundL1Message>,
        layer2: SyncTransformerCodec<InboundL1Message, InboundL2Message>,
        layer3: SyncTransformerCodec<InboundL2Message, InboundL3Message>,
        layer4: SyncTransformerCodec<InboundL3Message, InboundL4Message>,
    ) {
        this._layer1 = {
            codec: layer1,
            forward: (message) => layer2.transform(message, this._layer2.forward),
        };
        this._layer2 = {
            codec: layer2,
            forward: (message) => layer3.transform(message, this._layer3.forward),
        };
        this._layer3 = {
            codec: layer3,
            forward: (message) => layer4.transform(message, this._layer4.forward),
        };
        this._layer4 = {
            codec: layer4,
            forward: (message) => unwrap(this._controller).enqueue(message),
        };
    }

    public start(controller: TransformerCodecController<InboundL4Message>): void {
        this._controller = controller;
        this._layer1.codec.start?.(this._layer1.forward);
        this._layer2.codec.start?.(this._layer2.forward);
        this._layer3.codec.start?.(this._layer3.forward);
        this._layer4.codec.start?.(this._layer4.forward);
    }

    public transform(
        buffer: ArrayBuffer,
        controller: TransformerCodecController<InboundL4Message>,
    ): void {
        this._layer1.codec.transform(buffer, this._layer1.forward);
    }
}

class Layer1Through3DecoderTransformStreamAdapter
    implements AsyncTransformerCodec<ArrayBuffer, InboundL3Message>
{
    private readonly _layer1: {
        codec: SyncTransformerCodec<ArrayBuffer, InboundL1Message>;
        forward: (message: InboundL1Message) => void;
    };
    private readonly _layer2: {
        codec: SyncTransformerCodec<InboundL1Message, InboundL2Message>;
        forward: (message: InboundL2Message) => void;
    };
    private readonly _layer3: {
        codec: SyncTransformerCodec<InboundL2Message, InboundL3Message>;
        forward: (message: InboundL3Message) => void;
    };

    private _controller: TransformerCodecController<InboundL3Message> | undefined = undefined;

    public constructor(
        layer1: SyncTransformerCodec<ArrayBuffer, InboundL1Message>,
        layer2: SyncTransformerCodec<InboundL1Message, InboundL2Message>,
        layer3: SyncTransformerCodec<InboundL2Message, InboundL3Message>,
    ) {
        this._layer1 = {
            codec: layer1,
            forward: (message) => layer2.transform(message, this._layer2.forward),
        };
        this._layer2 = {
            codec: layer2,
            forward: (message) => layer3.transform(message, this._layer3.forward),
        };
        this._layer3 = {
            codec: layer3,
            forward: (message) => unwrap(this._controller).enqueue(message),
        };
    }

    public start(controller: TransformerCodecController<InboundL3Message>): void {
        this._controller = controller;
        this._layer1.codec.start?.(this._layer1.forward);
        this._layer2.codec.start?.(this._layer2.forward);
        this._layer3.codec.start?.(this._layer3.forward);
    }

    public transform(
        buffer: ArrayBuffer,
        controller: TransformerCodecController<InboundL3Message>,
    ): void {
        this._layer1.codec.transform(buffer, this._layer1.forward);
    }
}

/**
 * A Transform stream adapter that chains the synchronous encoder transform streams L4 through L1
 * together and exposes it as a single asynchronous transform stream.
 */
class Layer4Through1EncoderTransformStreamAdapter
    implements AsyncTransformerCodec<OutboundL4Message, Uint8Array>
{
    private readonly _layer4: {
        codec: SyncTransformerCodec<OutboundL4Message, OutboundL3Message>;
        forward: (message: OutboundL3Message) => void;
    };
    private readonly _layer3: {
        codec: SyncTransformerCodec<OutboundL3Message, OutboundL2Message>;
        forward: (message: OutboundL2Message) => void;
    };
    private readonly _layer1: {
        codec: SyncTransformerCodec<OutboundL2Message, Uint8Array>;
        forward: (message: Uint8Array) => void;
    };
    private _controller: TransformerCodecController<Uint8Array> | undefined = undefined;

    public constructor(
        layer4: SyncTransformerCodec<OutboundL4Message, OutboundL3Message>,
        layer3: SyncTransformerCodec<OutboundL3Message, OutboundL2Message>,
        layer1: SyncTransformerCodec<OutboundL2Message, Uint8Array>,
    ) {
        this._layer4 = {
            codec: layer4,
            forward: (message) => layer3.transform(message, this._layer3.forward),
        };
        this._layer3 = {
            codec: layer3,
            forward: (message) => layer1.transform(message, this._layer1.forward),
        };
        this._layer1 = {
            codec: layer1,
            forward: (frame) => unwrap(this._controller).enqueue(frame),
        };
    }

    public start(controller: TransformerCodecController<Uint8Array>): void {
        this._controller = controller;
        this._layer4.codec.start?.(this._layer4.forward);
        this._layer3.codec.start?.(this._layer3.forward);
        this._layer1.codec.start?.(this._layer1.forward);
    }

    public transform(
        message: OutboundL4Message,
        controller: TransformerCodecController<Uint8Array>,
    ): void {
        this._layer4.codec.transform(message, this._layer4.forward);
    }
}

/**
 * A Transform stream adapter that chains the synchronous encoder transform streams L3 through L1
 * together and exposes it as a single asynchronous transform stream.
 */
class Layer3Through1EncoderTransformStreamAdapter
    implements AsyncTransformerCodec<OutboundDropDeviceLayerMessage, Uint8Array>
{
    private readonly _layer3: {
        codec: SyncTransformerCodec<OutboundDropDeviceLayerMessage, OutboundL2Message>;
        forward: (message: OutboundL2Message) => void;
    };
    private readonly _layer1: {
        codec: SyncTransformerCodec<OutboundL2Message, Uint8Array>;
        forward: (message: Uint8Array) => void;
    };
    private _controller: TransformerCodecController<Uint8Array> | undefined = undefined;

    public constructor(
        layer3: SyncTransformerCodec<OutboundDropDeviceLayerMessage, OutboundL2Message>,
        layer1: SyncTransformerCodec<OutboundL2Message, Uint8Array>,
    ) {
        this._layer3 = {
            codec: layer3,
            forward: (message) => layer1.transform(message, this._layer1.forward),
        };
        this._layer1 = {
            codec: layer1,
            forward: (frame) => unwrap(this._controller).enqueue(frame),
        };
    }

    public start(controller: TransformerCodecController<Uint8Array>): void {
        this._controller = controller;
        this._layer3.codec.start?.(this._layer3.forward);
        this._layer1.codec.start?.(this._layer1.forward);
    }

    public transform(
        message: OutboundDropDeviceLayerMessage,
        controller: TransformerCodecController<Uint8Array>,
    ): void {
        this._layer3.codec.transform(message, this._layer3.forward);
    }
}

export function applyD2mOnlyMediatorStreamPipeline(
    services: ServicesForBackend,
    stream: BidirectionalStream<ArrayBuffer, BufferSource>,
    controllers: {
        layer2: Layer2Controller;
        layer3: Layer3Controller;
        dropDeviceLayer: DropDeviceLayerController;
    },
    capture?: RawCaptureHandlers,
): MediatorPipe {
    const layer1 = new Layer1Codec(services, capture?.layer1);
    const layer2 = new Layer2Codec(services, controllers.layer2, capture?.layer2);
    const layer3 = new Layer3Codec(services, controllers.layer3, 'd2m-only', capture?.layer3);
    const dropDeviceLayer = new DropDeviceLayerCodec(
        services,
        controllers.dropDeviceLayer,
        capture?.dropDeviceLayer,
    );

    // Inbound pipeline
    const readable = stream.readable
        .pipeThrough(
            new TransformStream(
                new Layer1Through3DecoderTransformStreamAdapter(
                    layer1.decoder,
                    layer2.decoder,
                    layer3.decoder,
                ),
            ),
        )
        .pipeTo(dropDeviceLayer.decoder);

    // Outbound pipeline
    const writable = dropDeviceLayer.encoder
        .pipeThrough(
            new TransformStream(
                new Layer3Through1EncoderTransformStreamAdapter(layer3.encoder, layer1.encoder),
            ),
        )
        .pipeTo(stream.writable);

    return {
        readable,
        writable,
    };
}

export function applyMediatorStreamPipeline(
    services: ServicesForBackend,
    stream: BidirectionalStream<ArrayBuffer, BufferSource>,
    controllers: {
        layer2: Layer2Controller;
        layer3: Layer3Controller;
        layer4: Layer4Controller;
        layer5: Layer5Controller;
    },
    capture?: RawCaptureHandlers,
): MediatorPipe {
    // Create codecs
    const layer1 = new Layer1Codec(services, capture?.layer1);
    const layer2 = new Layer2Codec(services, controllers.layer2, capture?.layer2);
    const layer3 = new Layer3Codec(services, controllers.layer3, 'full', capture?.layer3);
    const layer4 = new Layer4Codec(services, controllers.layer4, capture?.layer4);
    const layer5 = new Layer5Codec(services, controllers.layer5, capture?.layer5);

    // Inbound pipeline
    const readable = stream.readable
        .pipeThrough(
            new TransformStream(
                new Layer1Through4DecoderTransformStreamAdapter(
                    layer1.decoder,
                    layer2.decoder,
                    layer3.decoder,
                    layer4.decoder,
                ),
            ),
        )
        .pipeTo(layer5.decoder);

    // Outbound pipeline
    const writable = layer5.encoder
        .pipeThrough(
            new TransformStream(
                new Layer4Through1EncoderTransformStreamAdapter(
                    layer4.encoder,
                    layer3.encoder,
                    layer1.encoder,
                ),
            ),
        )
        .pipeTo(stream.writable);

    return {
        readable,
        writable,
    };
}
