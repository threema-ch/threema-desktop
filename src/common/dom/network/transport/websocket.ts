import {
    type QueuingStrategy,
    type ReadableStreamDefaultController,
    type UnderlyingSink,
    type UnderlyingSource,
    type WritableStreamDefaultController,
    adapter,
    ReadableStream,
    WritableStream,
} from '~/common/dom/streams';
import {CloseCode} from '~/common/network';
import {type u16, type u32, type u53} from '~/common/types';
import {ProxyHandlerWrapper} from '~/common/utils/proxy';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';

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
        readonly url: string;
        readonly connection: Promise<WebSocketConnection>;
        readonly closed: Promise<WebSocketCloseInfo>;
        close: (closeInfo?: WebSocketCloseInfo) => void;
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
                controller.error(new Error('WebSocket connection closed without a close frame'));
            } else {
                // TODO(WEBMD-767): Propagate close code and reason
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

    public async cancel(closeInfo: WebSocketCloseInfo = {}): Promise<void> {
        this._ws.close(closeInfo.code, closeInfo.reason);
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
                const interval = self.setInterval(() => {
                    if (
                        this._ws.readyState === WebSocket.CLOSED ||
                        this._ws.bufferedAmount <= this._options.lowWaterMark
                    ) {
                        resolve();
                        self.clearInterval(interval);
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
    public async abort(closeInfo: WebSocketCloseInfo = {}): Promise<void> {
        this._ws.close(closeInfo.code, closeInfo.reason);
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
        } else {
            return chunk.byteLength;
        }
    }
}

export class WebSocketEventWrapperStream implements WebSocketStream {
    public readonly url: string;
    public readonly connection: Promise<WebSocketConnection>;
    public readonly closed: Promise<WebSocketCloseInfo>;

    private readonly _ws: WebSocket;

    public constructor(url: string, options: WebSocketEventWrapperStreamOptions) {
        this.url = url;
        const connection = (this.connection = new ResolvablePromise());
        const closed = (this.closed = new ResolvablePromise());

        // Create WebSocket (and we want ArrayBuffer's)
        this._ws = new WebSocket(url, options.protocols as string[]);
        this._ws.binaryType = 'arraybuffer';

        // Resolve connection once open.
        // Reject it on error, premature close or on abort.
        if (options.signal) {
            options.signal.onabort = (): void => {
                if (connection.done) {
                    return;
                }
                this._ws.close();
            };
        }
        this._ws.onopen = (): void => {
            this._ws.onclose = (event): void => {
                if (event.code === CloseCode.ABNORMAL_CLOSURE) {
                    closed.reject(new Error('WebSocket connection closed without a close frame'));
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

    public close(closeInfo?: WebSocketCloseInfo): void {
        this._ws.close(closeInfo?.code, closeInfo?.reason);
    }
}

export function createWebSocketStream(
    url: string,
    options: WebSocketEventWrapperStreamOptions,
): WebSocketStream {
    let ws: WebSocketStream | undefined;
    let connection: Promise<WebSocketConnection> | undefined;

    // TODO(WEBMD-767): Use the WebSocketStream API, if accessible
    //if (self.WebSocketStream) {
    //    ws = new WebSocketStream(url, options);
    //}

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
                // TODO(WEBMD-814): Remove the cast
                ReadableStream as adapter.ReadableStreamLikeConstructor,
            );
            const toPolyfillWritable = adapter.createWritableStreamWrapper(WritableStream);
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
                    } else {
                        return instance[property];
                    }
                },
            }),
        );
    } else {
        return ws;
    }
}
