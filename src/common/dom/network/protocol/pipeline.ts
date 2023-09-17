import type {ServicesForBackend} from '~/common/backend';
import type {MediatorPipe} from '~/common/dom/network';
import {
    type BidirectionalStream,
    ReadableStream,
    TransformStream,
    WritableStream,
} from '~/common/dom/streams';
import type {
    InboundL1Message,
    InboundL2Message,
    InboundL3Message,
    InboundL4Message,
    OutboundL2Message,
    OutboundL3Message,
    OutboundL4Message,
} from '~/common/network/protocol';
import type {RawCaptureHandlerPair, RawCaptureHandlers} from '~/common/network/protocol/capture';
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
import {CodecEnqueuerHandle} from '~/common/utils/codec';
import type {TimerCanceller} from '~/common/utils/timer';

/**
 * See `layer-1-codec.ts` for docs.
 */
class Layer1Codec {
    public readonly decoder: TransformStream<ArrayBuffer, InboundL1Message>;
    public readonly encoder: TransformStream<OutboundL2Message, Uint8Array>;

    public constructor(services: ServicesForBackend, capture?: RawCaptureHandlerPair) {
        this.decoder = new TransformStream(new Layer1Decoder(services, capture?.inbound));
        this.encoder = new TransformStream(new Layer1Encoder(services, capture?.outbound));
    }
}

/**
 * See `layer-2-codec.ts` for docs.
 */
export class Layer2Codec {
    public readonly decoder: TransformStream<InboundL1Message, InboundL2Message>;

    public constructor(
        services: ServicesForBackend,
        controller: Layer2Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        this.decoder = new TransformStream(
            new Layer2Decoder(services, controller, capture?.inbound),
        );
    }
}

/**
 * See `layer-3-codec.ts` for docs.
 */
class Layer3Codec {
    public readonly decoder: TransformStream<InboundL2Message, InboundL3Message>;
    public readonly encoder: TransformStream<OutboundL3Message, OutboundL2Message>;

    public constructor(
        services: ServicesForBackend,
        controller: Layer3Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        const log = services.logging.logger('network.pipeline.l3');
        log.debug('Initial CSP auth state:', CspAuthStateUtils.NAME_OF[controller.csp.state.get()]);
        log.debug('Initial D2M auth state:', D2mAuthStateUtils.NAME_OF[controller.d2m.state.get()]);
        const handle = new CodecEnqueuerHandle<OutboundL2Message>();
        this.decoder = new TransformStream(
            new Layer3Decoder(services, controller, handle, capture?.inbound),
        );
        this.encoder = new TransformStream(
            new Layer3Encoder(services, controller, handle, capture?.outbound),
        );
    }
}

/**
 * See `layer-4-codec.ts` for docs.
 */
class Layer4Codec {
    public readonly decoder: TransformStream<InboundL3Message, InboundL4Message>;
    public readonly encoder: TransformStream<OutboundL4Message, OutboundL3Message>;

    public constructor(
        services: ServicesForBackend,
        controller: Layer4Controller,
        capture?: RawCaptureHandlerPair,
    ) {
        const handle = new CodecEnqueuerHandle<OutboundL3Message>();
        const ongoingEchoRequests: TimerCanceller[] = [];
        this.decoder = new TransformStream(
            new Layer4Decoder(services, handle, ongoingEchoRequests, capture?.inbound),
        );
        this.encoder = new TransformStream(
            new Layer4Encoder(services, controller, handle, ongoingEchoRequests, capture?.outbound),
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
        this.decoder = new WritableStream(
            new Layer5Decoder(services, controller, capture?.inbound),
        );
        this.encoder = new ReadableStream(
            new Layer5Encoder(services, controller, capture?.outbound),
        );
    }
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
    const layer3 = new Layer3Codec(services, controllers.layer3, capture?.layer3);
    const layer4 = new Layer4Codec(services, controllers.layer4, capture?.layer4);
    const layer5 = new Layer5Codec(services, controllers.layer5, capture?.layer5);

    // Inbound pipeline
    const readable = stream.readable
        .pipeThrough(layer1.decoder)
        .pipeThrough(layer2.decoder)
        .pipeThrough(layer3.decoder)
        .pipeThrough(layer4.decoder)
        .pipeTo(layer5.decoder);

    // Outbound pipeline
    const writable = layer5.encoder
        .pipeThrough(layer4.encoder)
        .pipeThrough(layer3.encoder)
        .pipeThrough(layer1.encoder)
        .pipeTo(stream.writable);

    return {
        readable,
        writable,
    };
}
