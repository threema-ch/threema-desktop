/**
 * Layer 5: End-to-end layer.
 */
import {ConnectionClosed} from '~/common/error';
import {ensureError} from '~/common/utils/assert';
import type {
    AsyncCodecSink,
    AsyncCodecSource,
    SinkCodecController,
    SourceCodecController,
} from '~/common/utils/codec';
import type {QueueConsumer, QueueProducer} from '~/common/utils/queue';

import type {RawCaptureHandler} from './capture';
import type {DecoderQueueItem, EncoderQueueItem} from './task';
import type {ConnectedTaskManager} from './task/manager';

import type {InboundL4Message, OutboundL4Message} from '.';

/**
 * Properties needed to handle end-to-end encrypted messages.
 */
export interface Layer5Controller {
    /**
     * Protocol task manager.
     */
    readonly taskManager: ConnectedTaskManager;

    /**
     * Chat Server Protocol releated properties.
     */
    readonly csp: {
        /**
         * Resolves once the authentication process has been completed.
         */
        readonly authenticated: Promise<void>;
    };

    /**
     * Device to Mediator protocol related properties.
     */
    readonly d2m: {
        /**
         * Resolves once the authentication process has been completed.
         */
        readonly authenticated: Promise<void>;
    };
}

export class Layer5Decoder implements AsyncCodecSink<InboundL4Message> {
    private readonly _queue: QueueProducer<DecoderQueueItem>;
    private readonly _capture?: RawCaptureHandler;

    public constructor(controller: Layer5Controller, capture?: RawCaptureHandler) {
        this._queue = controller.taskManager.dispatch.decoder;
        this._capture = capture;
    }

    public async write(message: InboundL4Message, controller: SinkCodecController): Promise<void> {
        this._capture?.(message, {info: message.payload.constructor.name});
        try {
            await this._queue.put(message);
        } catch (error) {
            controller.error(ensureError(error));
        }
    }

    public close(): void {
        this._queue.error(new ConnectionClosed('lost', 'Connection lost by decoder/reader'));
    }

    public abort(reason: Error): void {
        this._queue.error(
            new ConnectionClosed('abort', 'Connection aborted by decoder/reader', {from: reason}),
        );
    }
}

export class Layer5Encoder implements AsyncCodecSource<OutboundL4Message> {
    private readonly _queue: QueueConsumer<EncoderQueueItem>;
    private readonly _capture?: RawCaptureHandler;

    public constructor(controller: Layer5Controller, capture?: RawCaptureHandler) {
        this._queue = controller.taskManager.dispatch.encoder;
        this._capture = capture;
    }

    public async pull(controller: SourceCodecController<OutboundL4Message>): Promise<void> {
        try {
            const message = (await this._queue.get()).consume();
            this._capture?.(message, {info: 'Unknown (TODO)'});
            controller.enqueue(message);
        } catch (error) {
            controller.error(ensureError(error));
        }
    }

    public cancel(reason: Error): void {
        this._queue.error(
            new ConnectionClosed('abort', 'Connection aborted by encoder/writer', {from: reason}),
        );
    }
}
