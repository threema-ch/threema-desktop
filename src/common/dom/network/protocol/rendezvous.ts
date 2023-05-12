import * as libthreema from 'libthreema';

import {type ServicesForBackend} from '~/common/backend';
import {
    createWebSocketStream,
    type WebSocketEventWrapperStreamOptions,
} from '~/common/dom/network/transport/websocket';
import {
    type BidirectionalStream,
    ReadableStream,
    TransformStream,
    WritableStream,
    type WritableStreamDefaultWriter,
} from '~/common/dom/streams';
import {TransferTag} from '~/common/enum';
import {BaseError} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type RendezvousAuthenticationKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type u32} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {registerErrorTransferHandler, TRANSFER_MARKER} from '~/common/utils/endpoint';
import {Queue} from '~/common/utils/queue';
import {type AbortRaiser} from '~/common/utils/signal';

/** A Rendezvous Path is a bidirectional byte stream. */
interface SinglePath extends BidirectionalStream<Uint8Array, ReadonlyUint8Array> {
    /**
     * Rendezvous Path ID.
     */
    readonly pid: u32;

    /**
     * Close this path.
     */
    readonly close: (reason?: Error) => void;
}

/** The single path nominated by the Rendezvous Protocol */
type NominatedPath = SinglePath;

/** A WebSocket used as source for a Rendezvous Path. */
class WebSocketPath implements SinglePath {
    public readonly readable: ReadableStream<Uint8Array>;
    public readonly writable: WritableStream<ReadonlyUint8Array>;
    public readonly close: SinglePath['close'];

    public constructor(
        public readonly pid: u32,
        ws: WebSocketStream,
        connection: WebSocketConnection,
    ) {
        this.readable = connection.readable.pipeThrough(
            new TransformStream({
                transform: (frame, controller) => {
                    if (!(frame instanceof ArrayBuffer)) {
                        controller.error(`Expected bytes, got ${typeof frame}`);
                        return;
                    }
                    controller.enqueue(new Uint8Array(frame));
                },
            }),
        );
        this.writable = connection.writable;
        this.close = () => ws.close();
    }

    /**
     * Create a WebSocket for use as a Rendezvous Path.
     *
     * @param pid The Rendezvous Path ID to use for this path. The caller must ensure that all paths
     *   have a unique PID.
     * @param url WebSocket URL.
     * @param abort An {@link AbortRaiser} that can be used to abort this path.
     */
    public static async create(pid: u32, url: string, abort: AbortRaiser): Promise<WebSocketPath> {
        const options: WebSocketEventWrapperStreamOptions = {
            signal: abort.attach(new AbortController()),
            // The below configuration gives us a theoretical maximum throughput of ~100 MiB/s if
            // the browser does not throttle the polling.
            highWaterMark: 2097152, // 2 MiB
            lowWaterMark: 131072, // 128 KiB
            pollIntervalMs: 20, // Poll every 20ms until the low water mark has been reached
        };
        const ws = createWebSocketStream(url, options);
        return new WebSocketPath(pid, ws, await ws.connection);
    }
}

/**
 * A Rendezvous Path (de)multiplexer bidirectional stream, operating on top of one or more
 * {@link SinglePath}s.
 *
 * Once one of the paths is nominated as a {@link NominatedPath}, all other paths are pruned.
 */
class MultiplexedPath
    implements
        BidirectionalStream<
            readonly [pid: u32, frame: Uint8Array],
            readonly [pid: u32, frame: ReadonlyUint8Array]
        >
{
    public readonly readable: ReadableStream<readonly [pid: u32, frame: Uint8Array]>;
    public readonly writable: WritableStream<readonly [pid: u32, frame: ReadonlyUint8Array]>;
    private _paths?: Map<
        u32,
        {
            readonly path: SinglePath;
            readonly writer: WritableStreamDefaultWriter<ReadonlyUint8Array>;
        }
    >;

    public constructor(
        abort: AbortRaiser,
        private readonly _log: Logger,
        paths: readonly SinglePath[],
    ) {
        // Queue for incoming messages
        const queue = new Queue<readonly [pid: u32, frame: Uint8Array]>();

        // Abort the queue when the protocol is aborted and vice versa.
        abort.subscribe(() => queue.error(new Error('Abort raised')));
        queue.aborted.catch((error) => {
            _log.debug('Queue aborted', error);
            abort.raise();
        });

        // Forward read (poll's) to the queue
        this.readable = new ReadableStream({
            pull: async (controller) => {
                const item = (await queue.get()).consume();
                controller.enqueue(item);
            },
            cancel: (reason) => {
                _log.debug('Multiplexed path reader cancelled, reason:', reason);
                abort.raise();
            },
        });

        // Forward writes to the respective path directly
        this.writable = new WritableStream({
            write: async ([pid, frame]) => {
                const path = this._paths?.get(pid);
                if (path === undefined) {
                    this._log.warn(`Attempted to send to an unknown path (pid=${pid})`);
                    return;
                }
                await path.writer.write(frame);
            },
            close: () => {
                _log.debug('Multiplexed path reader closed');
                abort.raise();
            },
        });

        this._paths = new Map(
            paths.map((path) => {
                // Pipe data into the queue (unblocking read/poll's of the queue).
                //
                // Note: This retains the flow control because the queue only ever accepts one
                // item at a time.
                path.readable
                    .pipeTo(
                        new WritableStream({
                            write: async (frame) => await queue.put([path.pid, frame]),
                        }),
                    )
                    .catch((error) => _log.error(`Path errored (pid=${path.pid})`, error))
                    .finally(() => {
                        // Drop the path from the internal map
                        const deleted = this._paths?.delete(path.pid) ?? false;
                        if (deleted) {
                            _log.debug(`Removed path (pid=${path.pid})`);
                        }

                        // If no paths remain, abort the protocol
                        if (this._paths !== undefined && this._paths.size === 0) {
                            _log.warn('All paths closed, aborting protocol');
                            this._paths = undefined;
                            abort.raise();
                        }
                    });

                // Abort the path when the queue aborted.
                //
                // Note: This implicitly catches protocol aborts because those abort the queue.
                queue.aborted.catch((error_) => {
                    const error = ensureError(error_);
                    path.close(error);
                });

                return [path.pid, {path, writer: path.writable.getWriter()}];
            }),
        );
    }

    /**
     * Nominate the specified path and close all other paths.
     */
    public nominate(nominatedPid: u32): NominatedPath {
        // Nomination can only happen once
        assert(this._paths !== undefined, 'Expected paths to exist when nominating');

        // Pop the nominated path
        const nominated = this._paths.get(nominatedPid);
        this._paths.delete(nominatedPid);
        assert(nominated !== undefined, 'Expecting nominated path to exist');
        this._log.info(`Nominated path (pid=${nominatedPid})`);

        // Close all other paths
        for (const {path, writer} of this._paths.values()) {
            this._log.debug(`Pruning path (pid=${path.pid})`);
            writer.releaseLock();
            path.close();
        }
        this._paths = undefined;

        // Return the nominated path.
        //
        // Note: It would be nice to return the actual single path itself here but this is hard to
        // accomplish because its readable side has been piped to the multiplexer, so an item could
        // linger in the queue. The streams API doesn't really have a suitable pattern for this
        // challenge.
        nominated.writer.releaseLock();
        return {
            pid: nominatedPid,
            close: (reason) => nominated.path.close(reason),
            readable: this.readable.pipeThrough(
                new TransformStream<readonly [pid: u32, frame: Uint8Array], Uint8Array>({
                    transform: ([pid, frame], controller) => {
                        assert(pid === nominatedPid);
                        controller.enqueue(frame);
                    },
                }),
            ),
            writable: nominated.path.writable,
        };
    }
}

/** Setup configuration for the Rendezvous Protocol. */
export interface RendezvousProtocolSetup {
    /**
     * Abort raiser to abort the protocol. Is also raised by the protocol in case the protocol errors or aborts.
     */
    readonly abort: AbortRaiser;
    /** Role used in the Rendezvous Protocol. */
    readonly role: 'initiator';
    /** Rendezvous Authentication Key to be used. */
    readonly ak: RendezvousAuthenticationKey;

    /** Relayed Web Socket to be used. */
    readonly relayedWebSocket: {
        readonly pathId: u32;
        readonly url: string;
    };
}

const RENDEZVOUS_PROTOCOL_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    RendezvousProtocolError,
    TransferTag.RENDEZVOUS_PROTOCOL_ERROR
>({
    tag: TransferTag.RENDEZVOUS_PROTOCOL_ERROR,
    serialize: () => [],
    deserialize: (message, cause) => new RendezvousProtocolError(message, {from: cause}),
});

/** Rendezvous Protocol error. */
export class RendezvousProtocolError extends BaseError {
    public [TRANSFER_MARKER] = RENDEZVOUS_PROTOCOL_ERROR_TRANSFER_HANDLER;
}

export class RendezvousConnection implements BidirectionalStream<Uint8Array, ReadonlyUint8Array> {
    public readonly readable: ReadableStream<Uint8Array>;
    public readonly writable: WritableStream<ReadonlyUint8Array>;

    private constructor(
        log: Logger,
        public readonly abort: AbortRaiser,
        protocol: libthreema.RendezvousProtocol,
        path: NominatedPath,
    ) {
        this.readable = path.readable.pipeThrough(
            new TransformStream({
                transform: (incomingFrame, controller) => {
                    // Process incoming frame
                    const result = RendezvousConnection._processIncomingFrame(
                        log,
                        protocol,
                        path.pid,
                        incomingFrame,
                    );

                    // We may receive an incomplete frame in which case we don't get a result
                    if (result === undefined) {
                        return;
                    }

                    // We're not expecting any state updates.
                    assert(result.stateUpdate === undefined, 'Unexpected state update');

                    // We're not expecting to send any outgoing frames since the handshake state machine
                    // has completed.
                    assert(
                        result.outgoingFrame === undefined,
                        'Unexpected outgoing frame in nominated state',
                    );

                    // We do expect incoming ULP data.
                    assert(result.incomingUlpData !== undefined, 'Expecting incoming ULP data');

                    // Hand out the incoming ULP data
                    log.debug(`Received ULP data (length=${result.incomingUlpData.byteLength})`);
                    controller.enqueue(result.incomingUlpData);
                },
            }),
        );
        {
            const transform = new TransformStream<ReadonlyUint8Array, ReadonlyUint8Array>({
                transform: (outgoingUlpData, controller) => {
                    // Encrypt data, create outgoing frame
                    let result;
                    try {
                        result = protocol.createUlpFrame(outgoingUlpData as Uint8Array);
                    } catch (error) {
                        throw new RendezvousProtocolError('Unable to create ULP frame', {
                            from: error,
                        });
                    }
                    log.debug(`Sending ULP data (length=${outgoingUlpData.byteLength}}`);

                    // We're not expecting any state updates
                    assert(result.stateUpdate === undefined, 'Unexpected state update');

                    // We're not expecting to receive any incoming ULP data.
                    assert(result.incomingUlpData === undefined, 'Unexpected incoming ULP data');

                    // We do expect an outgoing frame.
                    assert(result.outgoingFrame !== undefined, 'Expecting outgoing frame');

                    // Send the outgoing frame
                    controller.enqueue(result.outgoingFrame);
                },
            });
            this.writable = transform.writable;
            // Forward transformed messages to the nominated path
            void transform.readable.pipeTo(path.writable, {
                signal: abort.attach(new AbortController()),
            });
        }
    }

    /**
     * Start the Rendezvous Protocol and initiate a connection with the provided role. The resulting
     * {@link RendezvousConnection} will be handed out once nomination occurred.
     */
    public static async connect(
        services: Pick<ServicesForBackend, 'logging'>,
        setup: RendezvousProtocolSetup,
    ): Promise<{rph: ReadonlyUint8Array; connection: RendezvousConnection}> {
        const log = services.logging.logger(`rendezvous.${setup.role}`);
        setup.abort.subscribe(() => log.info('Closing protocol'));

        // Create and connect to all relevant (transport) paths simultaneously
        const paths: SinglePath[] = [
            await WebSocketPath.create(
                setup.relayedWebSocket.pathId,
                setup.relayedWebSocket.url,
                setup.abort,
            ),
        ];

        // Create protocol in libthreema
        let protocol;
        switch (setup.role) {
            case 'initiator':
                try {
                    protocol = libthreema.RendezvousProtocol.newAsRid(
                        false,
                        setup.ak.unwrap() as Uint8Array,
                        Uint32Array.from(paths.map(({pid}) => pid)),
                    );
                } catch (error) {
                    throw new RendezvousProtocolError('Could not create protocol', {from: error});
                }
                break;
            default:
                unreachable(setup.role);
        }
        const path = new MultiplexedPath(setup.abort, log, paths);
        const reader = path.readable.getReader();
        const writer = path.writable.getWriter();

        // Send initial frames
        for (const {pid, frame: outgoingFrame} of protocol.initialOutgoingFrames() ?? []) {
            await writer.write([pid, outgoingFrame]);
        }

        // Nomination loop where we run the handshakes simultaneously over all available paths until we
        // have nominated one path.
        log.info('Entering nomination loop');
        for (;;) {
            // Receive and process incoming frame
            const {value} = await reader.read();
            assert(value !== undefined, 'Expected reader to yield an incoming frame');
            const [pid, incomingFrame] = value;
            let result = RendezvousConnection._processIncomingFrame(
                log,
                protocol,
                pid,
                incomingFrame,
            );

            // Handle results
            while (result !== undefined) {
                // We're not expecting to receive any incoming ULP data.
                assert(result.incomingUlpData === undefined, 'Unexpected incoming ULP data');

                // Send any outgoing frame
                if (result.outgoingFrame !== undefined) {
                    await writer.write([pid, result.outgoingFrame]);
                }

                // Handle any state update
                const update = result.stateUpdate;
                switch (update?.state) {
                    case 'awaiting-nominate':
                        // Check if we should nominate the path
                        //
                        // TODO(DESK-1046): A real implementation should wait a bit and then choose
                        // the _best_ path based on the measured RTT.
                        log.debug('Path ready to nominate', {
                            measuredRttMs: update.measuredRttMs,
                        });
                        if (protocol.isNominator()) {
                            // eslint-disable-next-line max-depth
                            try {
                                result = protocol.nominatePath(pid);
                            } catch (error) {
                                throw new RendezvousProtocolError('Unable to nominate path', {
                                    from: error,
                                });
                            }
                        } else {
                            result = undefined;
                        }
                        break;
                    case 'nominated': {
                        reader.releaseLock();
                        writer.releaseLock();
                        const nominated = path.nominate(pid);
                        log.info('Nomination complete, rendezvous connection established');
                        return {
                            rph: update.rph,
                            connection: new RendezvousConnection(
                                log,
                                setup.abort,
                                protocol,
                                nominated,
                            ),
                        };
                    }
                    default:
                        result = undefined;
                }
            }
        }
    }

    private static _processIncomingFrame(
        log: Logger,
        protocol: libthreema.RendezvousProtocol,
        pid: u32,
        incomingFrame: Uint8Array,
    ): libthreema.PathProcessResult | undefined {
        const nominatedPid = protocol.nominatedPath();
        if (nominatedPid !== undefined && pid !== nominatedPid) {
            log.warn('Discarding chunk for unknown or dropped path', {
                pid,
                incomingFrame,
            });
            return undefined;
        }

        // Process incoming frame
        try {
            protocol.addChunk(pid, incomingFrame);
        } catch (error) {
            throw new RendezvousProtocolError('Unable to add chunk', {
                from: error,
            });
        }
        try {
            return protocol.processFrame(pid);
        } catch (error) {
            throw new RendezvousProtocolError('Unable to process frame', {
                from: error,
            });
        }
    }
}
