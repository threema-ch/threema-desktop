import {
    adapter,
    type QueuingStrategy,
    ReadableStream,
    type ReadableStreamDefaultController,
    type UnderlyingSink,
    type UnderlyingSource,
    WritableStream,
    type WritableStreamDefaultController,
} from '~/common/dom/streams';
import {RendezvousCloseCode} from '~/common/enum';
import {CloseCode} from '~/common/network';
import {closeCauseToCloseInfo, isRendezvousCloseCause} from '~/common/network/protocol/rendezvous';
import type {u16, u32, u53} from '~/common/types';
import {ProxyHandlerWrapper} from '~/common/utils/proxy';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {TIMER} from '~/common/utils/timer';

// Add `WebSocketStream` to global since it's not in lib.dom.ts yet.
declare global {
    interface WebSocketConnection {
        readonly readable: ReadableStream<ArrayBuffer | string>;
        readonly writable: WritableStream<BufferSource | string>;
        readonly extensions: string;
        readonly protocol: string;
    }

    interface WebSocketCloseInfo {
        code?: u16;
        reason?: string;
    }

    interface WebSocketStreamOptions {
        protocols?: readonly string[];
        signal?: AbortSignal;
    }

    interface WebSocketStream {
        readonly url: URL;
        readonly connection: Promise<WebSocketConnection>;
        readonly closed: Promise<WebSocketCloseInfo>;
        readonly close: (info?: WebSocketCloseInfo) => void;
    }

    /* eslint-disable @typescript-eslint/naming-convention */
    const WebSocketStream: {
        readonly prototype: WebSocketStream;
        new (url: string, options?: WebSocketStreamOptions): WebSocketStream;
    };

    interface Window {
        readonly WebSocketStream?: typeof WebSocketStream;
    }
    interface WorkerGlobalScope {
        readonly WebSocketStream?: typeof WebSocketStream;
    }
    /* eslint-enable @typescript-eslint/naming-convention */
}

/**
 * Note: Both low and high water marks need to be chosen carefully in relation
 *       to the poll interval to balance out the amount of CPU time needed for
 *       polling vs. memory pressure vs. throughput.
 */
export interface WebSocketEventWrapperStreamOptions extends WebSocketStreamOptions {
    readonly highWaterMark: u32;
    readonly lowWaterMark: u32;
    readonly pollIntervalMs: u32;
}

class WebSocketEventWrapperSource implements UnderlyingSource<ArrayBuffer | string> {
    private readonly _ws: WebSocket;
    private readonly _closed: Promise<WebSocketCloseInfo>;

    public constructor(ws: WebSocket, closed: Promise<WebSocketCloseInfo>) {
        this._ws = ws;
        this._closed = closed;
    }

    public start(
        controller: ReadableStreamDefaultController<ArrayBuffer | string>,
    ): void | PromiseLike<void> {
        this._ws.onmessage = (event): void => {
            controller.enqueue(event.data as ArrayBuffer);
        };
        this._ws.addEventListener('close', (event) => {
            if (event.code === CloseCode.ABNORMAL_CLOSURE) {
                // TODO(MED-73): Interprete 1006 to 1000 until the Mediator server no longer
                // violates the WS closing handshake. Remove the below code when fixed.
                try {
                    controller.close();
                } catch {
                    // Ignore
                }

                // TODO(MED-73): Re-enable this code when fixed
                // controller.error(new Error('WebSocket connection closed without a close frame'));
            } else {
                try {
                    controller.close();
                } catch {
                    // Above may fail if already closed/failed
                }
            }
        });
        this._ws.addEventListener('error', () => {
            controller.error(new Error('WebSocket error event fired'));
        });
    }

    public async cancel(reason?: {readonly ws?: WebSocketCloseInfo}): Promise<void> {
        this._ws.close(reason?.ws?.code, reason?.ws?.reason);
        await this._closed;
    }
}

class WebSocketEventWrapperSink implements UnderlyingSink<BufferSource | string> {
    private readonly _ws: WebSocket;
    private readonly _closed: Promise<WebSocketCloseInfo>;
    private readonly _options: WebSocketEventWrapperStreamOptions;

    public constructor(
        ws: WebSocket,
        closed: Promise<WebSocketCloseInfo>,
        options: WebSocketEventWrapperStreamOptions,
    ) {
        this._ws = ws;
        this._closed = closed;
        this._options = {...options};
    }

    public start(controller: WritableStreamDefaultController): void | PromiseLike<void> {
        this._ws.addEventListener('close', () => {
            controller.error(new Error('WebSocket connection closed'));
        });
        this._ws.addEventListener('error', () => {
            controller.error(new Error('WebSocket error event fired'));
        });
    }

    public write(message: BufferSource | string): undefined | Promise<void> {
        this._ws.send(message);

        // Apply backpressure (if needed)
        if (this._ws.bufferedAmount >= this._options.highWaterMark) {
            return new Promise((resolve) => {
                TIMER.repeat((cancel) => {
                    if (
                        this._ws.readyState === WebSocket.CLOSED ||
                        this._ws.bufferedAmount <= this._options.lowWaterMark
                    ) {
                        cancel();
                        resolve();
                    }
                }, this._options.pollIntervalMs);
            });
        }
        return undefined;
    }

    public async close(): Promise<void> {
        this._ws.close();
        await this._closed;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async abort(reason?: {readonly ws?: WebSocketCloseInfo}): Promise<void> {
        this._ws.close(reason?.ws?.code, reason?.ws?.reason);
    }
}

export class WebSocketByteLengthQueueingStrategy implements QueuingStrategy<BufferSource | string> {
    public readonly highWaterMark: u32;

    public constructor(highWaterMark: u32) {
        this.highWaterMark = highWaterMark;
    }

    public size(chunk: BufferSource | string): u53 {
        if (typeof chunk === 'string') {
            return chunk.length;
        }
        return chunk.byteLength;
    }
}

export class WebSocketEventWrapperStream implements WebSocketStream {
    public readonly connection: Promise<WebSocketConnection>;
    public readonly closed: Promise<WebSocketCloseInfo>;

    private readonly _ws: WebSocket;

    public constructor(
        public readonly url: URL,
        options: WebSocketEventWrapperStreamOptions,
    ) {
        const connection = (this.connection = new ResolvablePromise<WebSocketConnection, Error>({
            uncaught: 'discard',
        }));
        const closed = (this.closed = new ResolvablePromise({uncaught: 'discard'}));

        // Create WebSocket
        this._ws = new WebSocket(url, options.protocols as string[]);
        this._ws.binaryType = 'arraybuffer';

        // Resolve connection promise once open.
        // Reject promise on error, or prematurely close connection on abort.
        if (options.signal) {
            options.signal.onabort = (event): void => {
                if (connection.done) {
                    return;
                }

                // Forward close code and reason to WebSocket
                let code = RendezvousCloseCode.NORMAL;
                let reason;
                if (
                    event.target instanceof AbortSignal &&
                    isRendezvousCloseCause(event.target.reason)
                ) {
                    const closeInfo = closeCauseToCloseInfo(event.target.reason);
                    code = closeInfo.code;
                    reason = closeInfo.reason;
                }

                this._ws.close(code, reason);
            };
        }
        this._ws.onopen = (): void => {
            this._ws.onclose = (event): void => {
                if (event.code === CloseCode.ABNORMAL_CLOSURE) {
                    // TODO(MED-73): Translate 1006 to 1000 until the Mediator server no longer violates
                    // the WS closing handshake. Remove the below code when fixed.
                    closed.resolve({
                        code: 1000,
                        reason: "Normal closure... maybe... can't tell until MED-73 is fixed",
                    });

                    // TODO(MED-73): Re-enable this code when fixed
                    // closed.reject(new Error('WebSocket connection closed without a close frame'));
                } else {
                    closed.resolve({
                        code: event.code,
                        reason: event.reason,
                    });
                }
            };
            connection.resolve({
                readable: new ReadableStream(
                    new WebSocketEventWrapperSource(this._ws, this.closed),
                    new WebSocketByteLengthQueueingStrategy(options.highWaterMark),
                ),
                writable: new WritableStream(
                    new WebSocketEventWrapperSink(this._ws, this.closed, options),
                    new WebSocketByteLengthQueueingStrategy(options.highWaterMark),
                ),
                extensions: this._ws.extensions,
                protocol: this._ws.protocol,
            });
        };
        this._ws.onclose = (event): void =>
            connection.reject(new Error('WebSocket connection closed before it became open'));
        this._ws.onerror = (): void => {
            connection.reject(new Error('WebSocket error event fired'));
        };
    }

    public close(info?: WebSocketCloseInfo): void {
        this._ws.close(info?.code, info?.reason);
    }
}

export function createWebSocketStream(
    url: URL,
    options: WebSocketEventWrapperStreamOptions,
): WebSocketStream {
    let ws: WebSocketStream | undefined;
    let connection: Promise<WebSocketConnection> | undefined;

    // TODO(DESK-767): Use the WebSocketStream API, if accessible
    // if (self.WebSocketStream) {
    //     ws = new WebSocketStream(url, options);
    // }

    // Fall back to the event-based WebSocket API
    if (ws === undefined) {
        ws = new WebSocketEventWrapperStream(url, options);
        connection = ws.connection;
    }

    // Polyfill the connection, if needed
    if (connection === undefined) {
        connection = (async (): Promise<WebSocketConnection> => {
            const inner = await ws.connection;
            const toPolyfillReadable = adapter.createReadableStreamWrapper(
                // TODO(DESK-814): Remove the cast
                ReadableStream as adapter.ReadableStreamLikeConstructor,
            );
            const toPolyfillWritable = adapter.createWritableStreamWrapper(
                // TODO(DESK-904): Unsafe cast, remove once
                // https://github.com/MattiasBuelens/web-streams-polyfill has TypeScript 4.8+
                // support.
                WritableStream as adapter.WritableStreamLikeConstructor,
            );
            const readable = toPolyfillReadable(
                inner.readable as never,
            ) as unknown as ReadableStream<ArrayBuffer | string>;
            const writable = toPolyfillWritable(inner.writable) as WritableStream<
                BufferSource | string
            >;
            return new Proxy(
                inner,
                new ProxyHandlerWrapper({
                    get(instance, property: keyof WebSocketConnection): unknown {
                        switch (property) {
                            case 'readable':
                                return readable;
                            case 'writable':
                                return writable;
                            default:
                                return instance[property];
                        }
                    },
                }),
            );
        })();

        // Return polyfilled
        return new Proxy(
            ws,
            new ProxyHandlerWrapper({
                get(instance, property: keyof WebSocketStream): unknown {
                    if (property === 'connection') {
                        return connection;
                    }
                    return instance[property];
                },
            }),
        );
    }
    return ws;
}
