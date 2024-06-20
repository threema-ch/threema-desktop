import type {ServicesForBackend} from '~/common/backend';
import {
    GroupCallContextProvider,
    type GroupCallContextHandle,
} from '~/common/dom/webrtc/group-call';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {GroupCallIdValue, GroupCallId} from '~/common/network/protocol/call/group-call';
import type {u53} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {WeakValueMap} from '~/common/utils/map';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser, type RemoteAbortListener} from '~/common/utils/signal';
import type {WebRtcService} from '~/common/webrtc';
import type {GroupCallContext, AnyGroupCallContextAbort} from '~/common/webrtc/group-call';

export const MICROPHONE_STREAM_CONSTRAINTS: MediaTrackConstraints = {} as const;

export const CAMERA_STREAM_CONSTRAINTS: MediaTrackConstraints = {
    width: {ideal: 1280, max: 1280},
    height: {ideal: 960, max: 960},
    frameRate: {ideal: 30, max: 30},
    aspectRatio: {ideal: 4 / 3, max: 16 / 9},
} as const;

/**
 * A flow-controlled data channel.
 */
class FlowControlledDataChannel {
    private _ready: ResolvablePromise<void> = ResolvablePromise.resolve();

    public constructor(
        public readonly dc: RTCDataChannel,
        lowWaterMark: u53 = 256 * 1024, // 256 KiB
        private readonly _highWaterMark: u53 = 1024 * 1024, // 1 MiB
    ) {
        // Unpause once low water mark has been reached
        this.dc.bufferedAmountLowThreshold = lowWaterMark;
        this.dc.onbufferedamountlow = () => this._ready.resolve();
    }

    /**
     * Indicates whether the data channel is ready to be written to.
     */
    public get ready(): Promise<void> {
        return this._ready;
    }

    /**
     * Send a message to the data channel's internal buffer for delivery to the remote side.
     *
     * Important: Before calling this, the `ready` Promise must be awaited.
     *
     * @param message The message to be sent.
     * @throws Error in case the data channel is currently paused.
     */
    public send(message: Uint8Array): void {
        // Throw if paused
        if (!this._ready.done) {
            throw new Error('Unable to send, data channel is paused!');
        }

        // Try sending
        //
        // Note: Technically we should be able to catch a TypeError in case the underlying buffer is
        // full. However, there are other reasons that can result in a TypeError and no browser has
        // implemented this properly so far. Thus, we use a well-tested high water mark instead and
        // try to never fill the buffer completely.
        this.dc.send(message);

        // Pause once high water mark has been reached
        if (this.dc.bufferedAmount >= this._highWaterMark) {
            this._ready = new ResolvablePromise({uncaught: 'default'});
        }
    }
}

/**
 * A flow-controlled data channel that allows to queue an infinite amount of messages.
 *
 * While this cancels the effect of the flow control, it prevents the data channel's underlying
 * buffer from becoming saturated by queueing all messages in application space.
 */
export class UnboundedFlowControlledDataChannel extends FlowControlledDataChannel {
    private _queue: Promise<void> | undefined = this.ready;

    public constructor(
        private readonly _abort: AbortRaiser,
        private readonly _log: Logger,
        dc: RTCDataChannel,
        lowWaterMark?: u53,
        highWaterMark?: u53,
    ) {
        super(dc, lowWaterMark, highWaterMark);
        _abort.subscribe(() => (this._queue = undefined));
    }

    /**
     * Send a message to the data channel's internal or application buffer for
     * delivery to the remote side.
     *
     * @param message The message to be sent.
     */
    public override send(message: Uint8Array): void {
        // Wait until ready, then send.
        //
        // Note: This very simple technique allows for ordered message
        //       queueing by using the event loop.
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        this._queue = this._queue?.then(() => this._enqueueSend(message));
    }

    private async _enqueueSend(message: Uint8Array): Promise<void> {
        await this.ready;
        try {
            super.send(message);
        } catch (error) {
            this._log.error('Sending data channel message failed:', error);
            this._abort.raise(undefined);
            throw ensureError(error);
        }
    }
}

export class ReplaceableDataChannelMessageListener {
    private readonly _backlog: Uint8Array[] = [];
    private _listener: ((array: Uint8Array) => void) | undefined;

    public constructor(dc: RTCDataChannel) {
        dc.binaryType = 'arraybuffer';
        dc.addEventListener('message', ({data}) => {
            const array = new Uint8Array(data as ArrayBuffer);
            if (this._listener === undefined) {
                this._backlog.push(array);
                return;
            }
            this._listener(array);
        });
    }

    public replace(listener?: (array: Uint8Array) => void): this {
        this._listener = listener;

        // Dispatch all backlogged messages
        for (;;) {
            // A listener may call `replace` at any point in time in which case we need to abort
            // dispatching backlogged messages
            if (this._listener === undefined) {
                return this;
            }

            // Dispatch next backlogged message (if any)
            const array = this._backlog.shift();
            if (array === undefined) {
                return this;
            }
            this._listener(array);
        }
    }
}

/**
 * Functionality of WebRTC only available in the main thread.
 */
export class WebRtcServiceProvider implements WebRtcService {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _log: Logger;
    private readonly _groupCall: {
        readonly map: WeakValueMap<GroupCallIdValue, GroupCallContextProvider>;
        readonly registry: FinalizationRegistry<{
            readonly callId: GroupCallId;
            readonly abort: AbortRaiser;
        }>;
    } = {
        map: new WeakValueMap(),
        registry: new FinalizationRegistry(({callId, abort}) => {
            if (abort.aborted) {
                return;
            }
            this._log.warn(`Group call context garbage-collected (id=${callId.id})`);
            abort.raise(undefined);
        }),
    };

    public constructor(
        private readonly _services: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
    ) {
        this._log = _services.logging.logger('webrtc.service');
    }

    /** @inheritdoc */
    public createGroupCallContext(
        remote: RemoteAbortListener<AnyGroupCallContextAbort>,
        callId: GroupCallId,
    ): GroupCallContext {
        if (this._groupCall.map.get(callId.id) !== undefined) {
            throw new Error(
                `A WebRtcGroupCallContextProvider instance for the group call '${callId.id}' already exists`,
            );
        }

        // Create WebRTC group call context
        const abort = new AbortRaiser<AnyGroupCallContextAbort>();
        abort.subscribe(() => {
            this._log.debug(`Group call context removed (id=${callId.id})`);
            this._groupCall.map.delete(callId.id);
        });
        remote.forward(abort);
        const context = new GroupCallContextProvider(this._services, callId, abort);
        this._groupCall.map.set(callId.id, context);
        this._groupCall.registry.register(context, {
            callId,
            abort: abort.derive({
                local: () => undefined,
                remote: () => ({origin: 'main-thread', cause: 'unexpected-error'}),
            }),
        });
        return context;
    }

    /** Retrieve the {@link GroupCallContext} associated to the {@link callId}. */
    public getGroupCallContextHandle(callId: GroupCallId): GroupCallContextHandle | undefined {
        return this._groupCall.map.get(callId.id)?.handle();
    }
}
