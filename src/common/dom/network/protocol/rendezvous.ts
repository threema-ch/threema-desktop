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
import * as protobuf from '~/common/network/protobuf';
import {UNIT_MESSAGE} from '~/common/network/protobuf';
import {type RendezvousAuthenticationKey} from '~/common/network/types/keys';
import {type ReadonlyUint8Array, type u32} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';
import {byteSplit} from '~/common/utils/byte';
import {registerErrorTransferHandler, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {Queue} from '~/common/utils/queue';
import {AbortRaiser} from '~/common/utils/signal';

/** A Path ID uniquely identifies a rendezvous connection path. */
export type PathId = u32;

/** A Rendezvous Path is a bidirectional byte stream. */
interface SinglePath extends BidirectionalStream<Uint8Array, ReadonlyUint8Array> {
    /**
     * Rendezvous Path ID.
     */
    readonly pid: PathId;

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

    private constructor(
        public readonly pid: PathId,
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
        ws.closed.catch((error) => {
            // Ignore, in order to prevent unhandled rejection error. The connection closing event
            // is already handled via the stream closing.
        });
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
    public static async create(
        pid: PathId,
        url: string,
        abort: AbortRaiser,
    ): Promise<WebSocketPath> {
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
            readonly [pid: PathId, frame: Uint8Array],
            readonly [pid: PathId, frame: ReadonlyUint8Array]
        >
{
    public readonly readable: ReadableStream<readonly [pid: PathId, frame: Uint8Array]>;
    public readonly writable: WritableStream<readonly [pid: PathId, frame: ReadonlyUint8Array]>;
    private _paths?: Map<
        PathId,
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
        // Queue for incoming frames
        const queue = new Queue<readonly [pid: PathId, frame: Uint8Array]>();

        // Abort the queue when the protocol is aborted and vice versa.
        abort.subscribe(() => queue.error(new Error('Abort raised')));
        queue.aborted.catch((error) => {
            _log.debug('Queue aborted', error);
            abort.raise(undefined);
        });

        // Forward read (poll's) to the queue
        this.readable = new ReadableStream({
            pull: async (controller) => {
                const result = await queue.get();
                result.consume((incomingFrame) => controller.enqueue(incomingFrame));
            },
            cancel: (reason) => {
                _log.debug('Multiplexed path reader cancelled, reason:', reason);
                abort.raise(undefined);
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
                _log.debug('Multiplexed path writer closed');
                abort.raise(undefined);
            },
            abort: (reason) => {
                _log.debug('Multiplexed path writer aborted, reason:', reason);
                abort.raise(undefined);
            },
        });

        this._paths = new Map(
            paths.map((path) => {
                // Pipe data into the queue (unblocking read/poll's of the queue).
                //
                // Note: This retains the flow control because the queue only ever accepts one
                // incoming frame at a time.
                path.readable
                    .pipeTo(
                        // TODO(DESK-1096): Instead of always aborting the queue, we should probably
                        // abort only if it was the last path
                        new WritableStream({
                            write: async (frame) => await queue.put([path.pid, frame]),
                            close: () => queue.error(new Error('Path reader closed')),
                            abort: (reason) => {
                                queue.error(new Error(`Path reader aborted: ${reason}`));
                            },
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
                            abort.raise(undefined);
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
    public nominate(nominatedPid: PathId): NominatedPath {
        // Nomination can only happen once
        assert(this._paths !== undefined, 'Expected paths to exist when nominating');

        // Pop the nominated path
        const nominated = this._paths.get(nominatedPid);
        this._paths.delete(nominatedPid);
        assert(nominated !== undefined, 'Expected nominated path to exist');
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
        // accomplish because its readable side has been piped to the multiplexer, so an incoming
        // frame could linger in the queue. The streams API doesn't really have a suitable pattern
        // for this challenge.
        nominated.writer.releaseLock();
        return {
            pid: nominatedPid,
            close: (reason) => nominated.path.close(reason),
            readable: this.readable.pipeThrough(
                new TransformStream<readonly [pid: PathId, frame: Uint8Array], Uint8Array>({
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
    /** Role used in the Rendezvous Protocol. */
    readonly role: 'initiator';
    /** Rendezvous Authentication Key to be used. */
    readonly ak: RendezvousAuthenticationKey;

    /** Relayed Web Socket to be used. */
    readonly relayedWebSocket: {
        readonly pathId: PathId;
        readonly url: string;
    };
}

/** Result retrieved after establishing a Rendezvous Connection. */
export interface RendezvousConnectResult {
    readonly rph: ReadonlyUint8Array;
    readonly connection: RendezvousConnection;
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
    public [TRANSFER_HANDLER] = RENDEZVOUS_PROTOCOL_ERROR_TRANSFER_HANDLER;
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

                    // Hand out the incoming ULP data (if any)
                    if (result.incomingUlpData !== undefined) {
                        log.debug(
                            `Received ULP data (length=${result.incomingUlpData.byteLength})`,
                        );
                        controller.enqueue(result.incomingUlpData);
                    }
                },
            }),
        );
        {
            const transform = new TransformStream<ReadonlyUint8Array, ReadonlyUint8Array>({
                transform: (outgoingUlpData, controller) => {
                    // Create outgoing frame
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

                    // Send the outgoing frame in 1 MiB chunks
                    //
                    // Note: We do this here as it's much more convenient than doing it in all the
                    // individual `SinglePath`s and 1 MiB is a sensible amount of data for good
                    // performance on any kind of stream.
                    for (const chunk of byteSplit(result.outgoingFrame, 1024 * 1024)) {
                        controller.enqueue(chunk);
                    }
                },
            });
            this.writable = transform.writable;

            // Forward outgoing frames to the nominated path
            transform.readable
                .pipeTo(path.writable, {
                    signal: abort.attach(new AbortController()),
                })
                .catch((error) => {
                    // Ignore
                });
        }
    }

    public static async create(
        services: Pick<ServicesForBackend, 'logging'>,
        setup: RendezvousProtocolSetup,
    ): Promise<{
        readonly connect: () => Promise<RendezvousConnectResult>;
        readonly abort: () => void;
        readonly joinUri: string;
    }> {
        const log = services.logging.logger(`rendezvous.${setup.role}`);
        const abort = new AbortRaiser();

        // Create and connect to all relevant (transport) paths simultaneously
        const paths: readonly SinglePath[] = [
            await WebSocketPath.create(
                setup.relayedWebSocket.pathId,
                setup.relayedWebSocket.url,
                abort,
            ),
        ];

        // Return function handle that establishes a connection.
        return {
            connect: async () => await RendezvousConnection._connect(setup, abort, log, paths),
            abort: () => abort.raise(undefined),
            joinUri: getJoinUri(setup),
        };
    }

    /**
     * Start the Rendezvous Protocol and initiate a connection with the provided role. The resulting
     * {@link RendezvousConnection} will be handed out once nomination occurred.
     */
    private static async _connect(
        setup: RendezvousProtocolSetup,
        abort: AbortRaiser,
        log: Logger,
        paths: readonly SinglePath[],
    ): Promise<RendezvousConnectResult> {
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
        const path = new MultiplexedPath(abort, log, paths);
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
                            connection: new RendezvousConnection(log, abort, protocol, nominated),
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
        pid: PathId,
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

/**
 * Return device Join URI.
 */
function getJoinUri(setup: RendezvousProtocolSetup): string {
    // Construct a Protobuf DeviceGroupJoinRequestOrOffer
    const version = protobuf.url.DeviceGroupJoinRequestOrOffer.Version.V1_0;
    const variant = protobuf.utils.creator(protobuf.url.DeviceGroupJoinRequestOrOffer.Variant, {
        requestToJoin: UNIT_MESSAGE,
        offerToJoin: undefined,
    });
    const relayedWebSocket = protobuf.utils.creator(
        protobuf.rendezvous.RendezvousInit.RelayedWebSocket,
        {
            pathId: setup.relayedWebSocket.pathId,
            networkCost: protobuf.rendezvous.RendezvousInit.NetworkCost.UNKNOWN,
            url: setup.relayedWebSocket.url,
        },
    );
    const rendezvousInit = protobuf.utils.creator(protobuf.rendezvous.RendezvousInit, {
        version: protobuf.rendezvous.RendezvousInit.Version.V1_0,
        ak: setup.ak.unwrap() as Uint8Array,
        relayedWebSocket,
        directTcpServer: undefined,
    });
    const joinRequest = protobuf.utils.creator(protobuf.url.DeviceGroupJoinRequestOrOffer, {
        version,
        variant,
        rendezvousInit,
    });

    // Encode request into base64 bytes
    const bytes = protobuf.url.DeviceGroupJoinRequestOrOffer.encode(joinRequest).finish();
    const urlSafeBase64 = u8aToBase64(bytes, {urlSafe: true});
    return `threema://device-group/join#${urlSafeBase64}`;
}
