import type {ServicesForBackend} from '~/common/backend';
import {NACL_CONSTANTS, wrapRawKey} from '~/common/crypto';
import {SharedBoxFactory} from '~/common/crypto/box';
import {
    applyMediatorStreamPipeline,
    applyD2mOnlyMediatorStreamPipeline,
} from '~/common/dom/network/protocol/pipeline';
import {MediatorWebSocketTransport} from '~/common/dom/network/transport/mediator-websocket';
import type {WebSocketEventWrapperStreamOptions} from '~/common/dom/network/transport/websocket';
import {type BrowserInfo, getBrowserInfo, makeCspClientInfo} from '~/common/dom/utils/browser';
import type {SystemInfo} from '~/common/electron-ipc';
import {
    CloseCode,
    CloseCodeUtils,
    CspAuthStateUtils,
    D2mAuthStateUtils,
    D2mLeaderState,
    D2mLeaderStateUtils,
    GlobalPropertyKey,
} from '~/common/enum';
import {ConnectionClosed, extractErrorTraceback, ProtocolError} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import {createLoggerStyle, type Logger} from '~/common/logging';
import type {CloseInfo} from '~/common/network';
import * as protobuf from '~/common/network/protobuf';
import type {RawCaptureHandlers} from '~/common/network/protocol/capture';
import type {ConnectionManagerHandle} from '~/common/network/protocol/connection';
import {
    type ConnectionHandle,
    FullProtocolController,
    type ClosingEvent,
    D2mOnlyProtocolController,
} from '~/common/network/protocol/controller';
import {
    ConnectionState,
    ConnectionStateUtils,
    CspAuthState,
    D2mAuthState,
} from '~/common/network/protocol/state';
import {DropDeviceTask} from '~/common/network/protocol/task/d2m/drop-device';
import {ConnectedTaskManager} from '~/common/network/protocol/task/manager';
import type {TemporaryClientKey} from '~/common/network/types/keys';
import type {u53} from '~/common/types';
import {assert, assertUnreachable, ensureError, unreachable} from '~/common/utils/assert';
import {Delayed} from '~/common/utils/delayed';
import {PROXY_HANDLER} from '~/common/utils/endpoint';
import {clamp} from '~/common/utils/number';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser, type AbortListener} from '~/common/utils/signal';
import {
    MonotonicEnumStore,
    type StoreUnsubscriber,
    type StrictMonotonicEnumStore,
} from '~/common/utils/store';
import {TIMER} from '~/common/utils/timer';

interface ClosingSignal {
    readonly done: ResolvablePromise<void>;
    readonly raiser: AbortRaiser<{
        readonly info: CloseInfo;
        readonly done: ResolvablePromise<void>;
    }>;
}

type ClosedRaiser = AbortRaiser<{
    readonly type: 'normal' | 'error';
    readonly info: CloseInfo;
    readonly disconnectForMs?: u53;
}>;

/**
 * Platform details, e.g. "Firefox 91"
 */
function makeD2mPlatformDetails(browserInfo: BrowserInfo, systemInfo: SystemInfo): string {
    let details = browserInfo.name;
    if (browserInfo.version !== undefined) {
        details += ` ${browserInfo.version}`;
    }
    switch (systemInfo.os) {
        case 'linux':
            details += ' on Linux';
            break;
        case 'macos':
            details += ' on macOS';
            break;
        case 'windows':
            details += ' on Windows';
            break;
        case 'other':
            break;
        default:
            unreachable(systemInfo.os);
    }
    return details;
}

/**
 * Handles a single connection to the mediator server.
 */
class Connection {
    public constructor(
        /**
         * Raises immediately when the connection has been closed or should be closed.
         *
         * Note: Only for internal use! The closing sequence may still be ongoing! Use
         * {@link _closing} instead to await the closing sequence.
         */
        private readonly _closed: AbortRaiser<{
            readonly type: 'normal' | 'error';
            readonly info: CloseInfo;
        }>,

        /**
         * Raises immediately when the connection is in the closing sequence. The inner promise
         * resolves when the reader has been drained.
         */
        private readonly _closing: AbortRaiser<{
            readonly info: CloseInfo;
            readonly done: ResolvablePromise<void>;
            readonly disconnectForMs?: u53;
        }>,

        private readonly _mediator: MediatorWebSocketTransport,
        public readonly state: StrictMonotonicEnumStore<ConnectionState>,
        public readonly leaderState: StrictMonotonicEnumStore<D2mLeaderState>,
        public readonly reflectionQueueDry: ResolvablePromise<void>,
        public readonly serverInfo: ResolvablePromise<protobuf.validate.d2m.ServerInfo.Type>,
    ) {}

    public static async create(
        services: ServicesForBackend,
        manager: ConnectionManagerHandle,
        taskManager: ConnectedTaskManager,
        getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ): Promise<Connection> {
        const {
            device,
            logging,
            model: {user},
        } = services;
        const log = logging.logger(`connection.${taskManager.id}`, connectionLoggerStyle);
        const {
            abort,
            baseUrl,
            closed,
            closing,
            connectionState,
            cspClientInfo,
            leaderState,
            tck,
            delayedConnection,
            d2mPlatformDetails,
            options,
        } = Connection._setupConnectionParameters(services, log);

        log.debug(`Connecting to ${baseUrl}`);

        const controller = new FullProtocolController(
            services,
            taskManager,
            {manager, current: delayedConnection, closing: closing.raiser},
            // CSP
            {
                ck: device.csp.ck,
                tck,
                identity: device.identity.bytes,
                info: cspClientInfo,
                deviceId: device.csp.deviceId,
                deviceCookie: device.csp.deviceCookie,
                // TODO(DESK-775): Get from config
                echoRequestIntervalS: 10,
                // TODO(DESK-775): Get from config
                serverIdleTimeoutS: 30,
                // TODO(DESK-775): Get from config
                clientIdleTimeoutS: 10,
            },
            // D2M
            {
                dgpk: device.d2m.dgpk,
                dgdik: device.d2m.dgdik,
                deviceId: device.d2m.deviceId,
                deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy.PERSISTENT,
                platformDetails: d2mPlatformDetails,
                label: user.devicesSettings.get().view.deviceName,
            },
            // D2D
            {
                dgrk: device.d2d.dgrk,
                dgtsk: device.d2d.dgtsk,
            },
        );

        // Tie the connection state to the two protocol's auth states
        const unsubscribers = [
            controller.csp.state.subscribe((state) => {
                log.info(`CSP auth state: ${CspAuthStateUtils.NAME_OF[state]}`);
                // The transport state moves us into the "handshake" state, so we
                // only need to listen to the "completed" state.
                if (state === CspAuthState.COMPLETE) {
                    // We're "connected" if D2M is "complete", otherwise we're
                    // only "partially connected".
                    if (controller.d2m.state.get() !== D2mAuthState.COMPLETE) {
                        connectionState.set(ConnectionState.PARTIALLY_CONNECTED);
                    } else {
                        connectionState.set(ConnectionState.CONNECTED);
                    }
                }
            }),
            controller.d2m.state.subscribe((state) => {
                log.info(`D2M auth state: ${D2mAuthStateUtils.NAME_OF[state]}`);
                // The transport state moves us into the "handshake" state, so we
                // only need to listen to the "completed" state.
                if (state === D2mAuthState.COMPLETE) {
                    // We're "connected" if CSP is "complete", otherwise we're
                    // only "partially connected".
                    if (controller.csp.state.get() !== CspAuthState.COMPLETE) {
                        connectionState.set(ConnectionState.PARTIALLY_CONNECTED);
                    } else {
                        connectionState.set(ConnectionState.CONNECTED);
                    }
                }
            }),
        ];

        // Update leader state
        controller.d2m.promotedToLeader
            .then(() => leaderState.set(D2mLeaderState.LEADER))
            .catch((error: unknown) => {
                log.warn('Leader state promise errored', extractErrorTraceback(ensureError(error)));
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Leader state promise errored',
                    },
                });
            });

        const mediator = new MediatorWebSocketTransport(
            {
                baseUrl,
                deviceGroupId: device.d2m.dgpk.public,
                serverGroup: device.serverGroup,
            },
            options,
            (stream) =>
                applyMediatorStreamPipeline(
                    services,
                    stream,
                    {
                        layer2: controller.forLayer2(),
                        layer3: controller.forLayer3(),
                        layer4: controller.forLayer4(),
                        layer5: controller.forLayer5(),
                    },
                    getCaptureHandlers(),
                ),
        );

        await this._registerCloseHandlers(
            connectionState,
            mediator,
            closed,
            closing,
            unsubscribers,
            log,
        );

        // Run the task manager
        controller.taskManager
            .run(services, controller, abort)
            .then((v) => {
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Task manager stopped',
                    },
                });
                unreachable(v, 'Task manager stopped');
            })
            .catch((error: unknown) => {
                if (error instanceof ConnectionClosed) {
                    if (import.meta.env.VERBOSE_LOGGING.NETWORK) {
                        log.debug(
                            `Task manager stopped due to connection being closed (type=${error.type})`,
                        );
                    }
                } else {
                    log.error('Task manager errored:', extractErrorTraceback(ensureError(error)));
                }
            });

        const connection = new Connection(
            closed,
            closing.raiser,
            mediator,
            connectionState,
            leaderState,
            controller.d2m.reflectionQueueDry,
            controller.d2m.serverInfo,
        );
        delayedConnection.set(connection);
        return connection;
    }

    public static async createD2mOnly(
        services: ServicesForBackend,
        getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ): Promise<Connection> {
        const {
            device,
            logging,
            model: {user},
        } = services;
        const log = logging.logger(`connection.d2m-only`, connectionLoggerStyle);
        const {
            baseUrl,
            closed,
            closing,
            connectionState,
            cspClientInfo,
            leaderState,
            tck,
            delayedConnection,
            d2mPlatformDetails,
            options,
        } = Connection._setupConnectionParameters(services, log);
        const controller = new D2mOnlyProtocolController(
            services,
            {current: delayedConnection},
            // CSP
            {
                ck: device.csp.ck,
                tck,
                identity: device.identity.bytes,
                info: cspClientInfo,
                deviceId: device.csp.deviceId,
                deviceCookie: device.csp.deviceCookie,
                // TODO(DESK-775): Get from config
                echoRequestIntervalS: 10,
                // TODO(DESK-775): Get from config
                serverIdleTimeoutS: 30,
                // TODO(DESK-775): Get from config
                clientIdleTimeoutS: 10,
            },
            // D2M
            {
                dgpk: device.d2m.dgpk,
                dgdik: device.d2m.dgdik,
                deviceId: device.d2m.deviceId,
                deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy.PERSISTENT,
                platformDetails: d2mPlatformDetails,
                label: user.devicesSettings.get().view.deviceName,
            },
        );

        const unsubsriber = controller.d2m.state.subscribe((state) => {
            log.info(`D2M auth state: ${D2mAuthStateUtils.NAME_OF[state]}`);
            // The transport state moves us into the "handshake" state, so we
            // only need to listen to the "completed" state.
            if (state === D2mAuthState.COMPLETE) {
                connectionState.set(ConnectionState.PARTIALLY_CONNECTED);
            }
        });

        log.debug(`Connecting to ${baseUrl} without proxying the chatserver`);
        const mediator = new MediatorWebSocketTransport(
            {
                baseUrl,
                deviceGroupId: device.d2m.dgpk.public,
                serverGroup: device.serverGroup,
            },
            options,
            (stream) =>
                applyD2mOnlyMediatorStreamPipeline(
                    services,
                    stream,
                    {
                        layer2: controller.forLayer2(),
                        layer3: controller.forLayer3(),
                        dropDeviceLayer: controller.forDropDeviceLayer(),
                    },
                    getCaptureHandlers(),
                ),
        );

        await this._registerCloseHandlers(
            connectionState,
            mediator,
            closed,
            closing,
            [unsubsriber],
            log,
        );

        const connection = new Connection(
            closed,
            closing.raiser,
            mediator,
            connectionState,
            leaderState,
            controller.d2m.reflectionQueueDry,
            controller.d2m.serverInfo,
        );

        delayedConnection.set(connection);
        return connection;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private static _setupConnectionParameters(services: ServicesForBackend, log: Logger) {
        const {config, crypto, device} = services;

        const connectionState = ConnectionStateUtils.createStore(
            MonotonicEnumStore,
            ConnectionState.CONNECTING,
        );
        const leaderState = D2mLeaderStateUtils.createStore(
            MonotonicEnumStore,
            D2mLeaderState.NONLEADER,
        );

        // Generate ephemeral TCK
        const tck = new SharedBoxFactory(
            crypto,
            wrapRawKey(
                crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                NACL_CONSTANTS.KEY_LENGTH,
            ).asReadonly(),
        ) as TemporaryClientKey;

        // Create closing/closed event raisers
        const closing = {
            done: new ResolvablePromise<void>({uncaught: 'default'}),
            raiser: new AbortRaiser<{
                readonly info: CloseInfo;
                readonly done: ResolvablePromise<void>;
                readonly disconnectForMs?: u53;
            }>(),
        } as const;
        const closed = new AbortRaiser<{
            readonly type: 'normal' | 'error';
            readonly info: CloseInfo;
            readonly disconnectForMs?: u53;
        }>();
        let abort: AbortListener<CloseInfo>;
        {
            const abort_ = new AbortRaiser<CloseInfo>();
            closed.subscribe(({info}) => abort_.raise(info));
            abort = abort_;
        }

        // Create protocol controller
        const delayedConnection = Delayed.simple<ConnectionHandle>('ConnectionHandle');
        const browserInfo = getBrowserInfo(self.navigator.userAgent);
        const cspClientInfo = makeCspClientInfo(browserInfo, services.systemInfo);
        const d2mPlatformDetails = makeD2mPlatformDetails(browserInfo, services.systemInfo);
        log.debug(`CSP client info string: ${cspClientInfo}`);

        // Connect to mediator server and set up pipelines
        const options: WebSocketEventWrapperStreamOptions = {
            signal: abort.attach(new AbortController()),
            // The below configuration gives us a theoretical maximum throughput of 25 MiB/s
            // if the browser does not throttle the polling.
            highWaterMark: 524288, // 8 chunks of 64 KiB -> 512 KiB
            lowWaterMark: 131072, // 2 chunks of 64 KiB -> 128 KiB
            pollIntervalMs: 20, // Poll every 20ms until the low water mark has been reached
        };
        const baseUrl = config.mediatorServerUrl(device.d2m.dgpk.public);

        // The closing sequence always starts when the abort sequence fires. The inner done promise
        // will normally resolve when all pending Mediator frames have been processed, so that all
        // CSP alert/errors have been handled. It may also resolve immediately in case of an error.
        //
        // Only the readable pipeline is allowed to finish the closing sequence since we need to
        // check for CSP errors alerts before finishing the closing sequence.
        closed.subscribe(({type, info, disconnectForMs}) => {
            closing.raiser.raise({info, done: closing.done, disconnectForMs});

            // Short-circuit the closing sequence if...
            //
            // - the disconnect was initiated locally.
            // - we've encountered an error that lead to the closing of the transport.
            if (info.origin === 'local' || type === 'error') {
                log.debug('Short-circuiting closing sequence');
                closing.done.resolve();
            } else {
                log.info('Initiating closing sequence');
                closing.done
                    .then(() => log.info('Closing sequence completed'))
                    .catch(assertUnreachable);
            }
        });

        return {
            abort,
            baseUrl,
            closed,
            closing,
            connectionState,
            cspClientInfo,
            leaderState,
            tck,
            delayedConnection,
            d2mPlatformDetails,
            options,
        };
    }

    private static async _registerCloseHandlers(
        connectionState: MonotonicEnumStore<ConnectionState>,
        mediator: MediatorWebSocketTransport,
        closed: ClosedRaiser,
        closing: ClosingSignal,
        unsubscribers: StoreUnsubscriber[],
        log: Logger,
    ): Promise<void> {
        mediator.closed
            .then((info) => {
                log.info('Mediator transport closed cleanly:', info);
                closed.raise({
                    type: 'normal',
                    info,
                });
            })
            .catch((error: unknown) => {
                log.warn(
                    'Mediator transport closed with error:',
                    extractErrorTraceback(ensureError(error)),
                );
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Mediator transport closed with error',
                    },
                });
            })
            .finally(() => {
                for (const unsubscribe of unsubscribers) {
                    unsubscribe();
                }
                connectionState.set(ConnectionState.DISCONNECTED);
            });

        log.debug('Waiting for mediator transport to be connected');
        const pipe = await mediator.pipe;
        log.debug('Mediator transport pipe attached');
        pipe.readable
            .then(() => {
                // If we're not currently in the closing sequence, this is considered an error
                if (!closing.raiser.aborted) {
                    log.warn('Mediator transport readable pipe detached');
                    closed.raise({
                        type: 'error',
                        info: {
                            code: CloseCode.INTERNAL_ERROR,
                            origin: 'unknown',
                            reason: 'Mediator transport readable pipe detached',
                        },
                    });
                }
            })
            .catch((error: unknown) => {
                log.warn(
                    'Mediator transport readable side errored:',
                    extractErrorTraceback(ensureError(error)),
                );
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Mediator transport readable side errored',
                    },
                });
            })
            .finally(() => {
                // We have processed the readable queue, so we can resolve any closing sequence now
                closing.done.resolve();
            });
        pipe.writable
            .then(() => {
                log.warn('Mediator transport writable side detached');
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Mediator transport writable side detached',
                    },
                });
            })
            .catch((error: unknown) => {
                if (error instanceof ConnectionClosed) {
                    if (import.meta.env.VERBOSE_LOGGING.NETWORK) {
                        log.debug(
                            `Mediator transport writable side stopped due to connection being closed (type=${error.type})`,
                        );
                    }
                    return;
                }
                log.warn(
                    'Mediator transport writable side errored:',
                    extractErrorTraceback(ensureError(error)),
                );
                let disconnectForMs = undefined;
                if (
                    error instanceof ProtocolError &&
                    error.recoverability.type === 'recoverable-on-reconnect'
                ) {
                    disconnectForMs = error.recoverability.disconnectForMs;
                }
                closed.raise({
                    type: 'error',
                    info: {
                        code: CloseCode.INTERNAL_ERROR,
                        origin: 'unknown',
                        reason: 'Mediator transport writable side errored',
                    },
                    disconnectForMs,
                });
            });
        connectionState.set(ConnectionState.HANDSHAKE);
    }

    public get closing(): ClosingEvent {
        return this._closing;
    }

    /**
     * Immediately disconnects from the WebSocket. Starts the closing flow.
     *
     * Note: The closing flow will be skipped in case `info.origin` is 'local'. Otherwise, the
     * closing flow will be initiated and ensures that draining is possible prior to the `abort`
     * being raised.
     */
    public disconnect(info: CloseInfo): void {
        this._mediator.close(info);
    }
}

/**
 * Connection logger style (white on yellow).
 */
const connectionLoggerStyle = createLoggerStyle('#ee9b00', '#ffffff');

interface ConnectionResultConnected {
    readonly connected: true;
}
interface ConnectionResultDisconnected {
    readonly connected: false;
    readonly wasConnected: boolean;
    readonly info: CloseInfo;
    readonly disconnectForMs?: u53;
}

/**
 * The (simplified) result of a connection attempt where the result has been dumbed down to either
 * _fully connected_ (i.e. {@link ConnectionState.CONNECTED}) or disconnected.
 */
export type ConnectionResult = ConnectionResultConnected | ConnectionResultDisconnected;

/**
 * Handles connections to the mediator server. It ensures the following things:
 *
 * - That only one connection to the server is active.
 * - A persistent connection to the server, i.e. detects disconnects and does auto-reconnect when
 *   requested.
 * - Applies sensible delays between connection attempts to prevent DoS while providing reasonable
 *   UX.
 * - Manages the connection state.
 * - Ensures that all relevant tasks are not lost between reconnections.
 *
 * Note that the connection will only be established once the `readyToConnect` promise is resolved.
 */
export class ConnectionManager implements ConnectionManagerHandle {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;
    public readonly state: MonotonicEnumStore<ConnectionState>;
    public readonly leaderState: MonotonicEnumStore<D2mLeaderState>;
    private readonly _log: Logger;
    private _autoConnect: ResolvablePromise<void> = ResolvablePromise.resolve();
    private _connection: Connection | undefined = undefined;
    private _started = false;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _getCaptureHandlers: () => RawCaptureHandlers | undefined,
    ) {
        this._log = _services.logging.logger('connection.manager', connectionLoggerStyle);
        this.state = ConnectionStateUtils.createStore(
            MonotonicEnumStore,
            ConnectionState.DISCONNECTED,
            {
                log: _services.logging.logger('connection.state', connectionLoggerStyle),
                tag: 'state',
            },
        );
        this.leaderState = D2mLeaderStateUtils.createStore(
            MonotonicEnumStore,
            D2mLeaderState.NONLEADER,
            {
                log: _services.logging.logger('connection.leaderState', connectionLoggerStyle),
                tag: 'state',
            },
        );
    }

    /**
     * Must not be called before the connection is initialized.
     */
    public async reflectionQueueDry(): Promise<void> {
        assert(
            this._connection !== undefined,
            'Must not be called before the connection is initialized.',
        );
        return await this._connection.reflectionQueueDry;
    }

    /**
     * Must not be called before the connection is initialized.
     */
    public async reflectionQueueLength(): Promise<u53> {
        assert(
            this._connection !== undefined,
            'Must not be called before the connection is initialized.',
        );
        const serverInfo = await this._connection.serverInfo;
        return serverInfo.reflectionQueueLength;
    }

    /**
     * Start the connection manager and hand out the initial connection result.
     *
     * This will connect to the server and automatically reconnect on connection loss (unless
     * auto-connect is disabled).
     */
    public async start(): Promise<ConnectionResult> {
        if (this._started) {
            throw new Error('Started an already-started connection manager');
        }
        this._started = true;
        const runner = this._run();

        // Await the initial connection to be connected successfully or closed (before being fully
        // connected).
        const result = (await runner.next()).value;

        // Continue running connections
        async function runForever(): Promise<never> {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            for await (const _ of runner) {
                // Fooooreeever
            }
            assertUnreachable('Connection runner should never return');
        }
        runForever().catch((error: unknown) =>
            assertUnreachable(`Connection manager failed to run: ${error}`),
        );

        return result;
    }

    /**
     * Kicks the current device from the mediator server.
     *
     * In case the connection was killed by the CSP, this function creates a D2M only connection to
     * the mediator server only and kicks the device.
     *
     * Rejects if the D2M only connection fails (e.g. there is no connection).
     */
    public async selfKickFromMediator(): Promise<CloseInfo | undefined> {
        try {
            await this._services.taskManager.schedule(
                new DropDeviceTask(this._services.device.d2m.deviceId),
            );
            return undefined;
        } catch (error) {
            this._log.debug('Failed to drop device, falling back to D2M only pipeline');
            return await this._startD2mOnlyConnectionAndUnlink();
        }
    }

    /** @inheritdoc */
    public disconnect(info: CloseInfo = {code: CloseCode.NORMAL, origin: 'local'}): void {
        this._connection?.disconnect(info);
    }

    /** @inheritdoc */
    public disconnectAndDisableAutoConnect(info?: CloseInfo): void {
        this.disconnect(info);
        if (this._autoConnect.done) {
            this._log.debug('Turning off auto-connect');
            this._autoConnect = new ResolvablePromise({uncaught: 'default'});
        }
    }

    /** @inheritdoc */
    public enableAutoConnect(): void {
        if (!this._autoConnect.done) {
            this._log.debug('Turning on auto-connect');
            this._autoConnect.resolve();
        }
    }

    /** @inheritdoc */
    public toggleAutoConnect(): void {
        if (this._autoConnect.done) {
            this.disconnectAndDisableAutoConnect();
        } else {
            this.enableAutoConnect();
        }
    }

    private async *_run(): AsyncGenerator<ConnectionResult, never> {
        const {model, config, systemDialog} = this._services;
        const reconnectionDelayMs = config.MEDIATOR_RECONNECTION_DELAY_S * 1000;
        let skipConnectionDelay = false;
        for (;;) {
            // Check if we should (re)connect.
            if (!this._autoConnect.done) {
                this._log.debug(
                    'Auto-connect currently disabled. Waiting until auto-connect has been re-enabled.',
                );
            }
            await this._autoConnect;

            // Check if network connectivity is available.
            //
            // Note: We cannot use the 'online' event because it does not fire on its own without
            //       something making a network request. In other words, it is totally useless. See:
            //       https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
            if (!self.navigator.onLine) {
                this._log.debug('Currently offline. Connection will probably fail.');
            }

            // Connect, yield connected result (if any), otherwise wait until closed
            const startMs = Date.now();
            let result: ConnectionResult | undefined;
            for await (result of this._connectAndWaitUntilClosed()) {
                yield result;
            }
            // The last result must be the disconnect event
            assert(result !== undefined && !result.connected);
            const elapsedMs = Date.now() - startMs;

            if (CloseCodeUtils.containsNumber(result.info.code)) {
                // Exhaustively handle known close codes
                switch (result.info.code) {
                    case CloseCode.UNSUPPORTED_PROTOCOL_VERSION:
                        switch (result.info.origin) {
                            case 'local': {
                                const handle = await systemDialog.open({
                                    type: 'connection-error',
                                    context: {
                                        error: 'mediator-update-required',
                                    },
                                });
                                this._log.info(
                                    'Waiting for user interaction before re-enabling auto-connect',
                                );
                                const action = await handle.closed;
                                // eslint-disable-next-line max-depth
                                switch (action) {
                                    case 'confirmed': // Reconnect
                                        skipConnectionDelay = true;
                                        break;
                                    case 'dismissed':
                                        this.disconnectAndDisableAutoConnect(result.info);
                                        break;
                                    default:
                                        unreachable(action);
                                }
                                break;
                            }

                            case 'remote':
                                systemDialog
                                    .open({
                                        type: 'connection-error',
                                        context: {
                                            error: 'client-update-required',
                                        },
                                    })
                                    .catch(assertUnreachable);

                                this.disconnectAndDisableAutoConnect(result.info);
                                break;

                            case 'unknown':
                                // ¯\_(ツ)_/¯ retry, I guess?
                                break;

                            default:
                                unreachable(result.info.origin);
                        }
                        break;
                    case CloseCode.DEVICE_DROPPED:
                    case CloseCode.EXPECTED_DEVICE_SLOT_STATE_MISMATCH:
                        // Both cases happen for the same reason (another device dropped us from the multi-device group)
                        // but DEVICE_DROPPED happens while we are connected, and EXPECTED_DEVICE_SLOT_STATE_MISMATCH
                        // when the dropping happened while we were offline and we are trying to reconnect.

                        // Check if device was dropped because of unrecoverable state.
                        if (
                            model.globalProperties.get('applicationState')?.get().view.value
                                .unrecoverableStateDetected === true
                        ) {
                            this._log.error(
                                'Connection not established: Device is dropped due to unrecoverable application state',
                            );

                            systemDialog
                                .open({
                                    type: 'unrecoverable-state',
                                })
                                .catch(assertUnreachable);
                        } else {
                            this._log.error(
                                `Connection not established: ${CloseCodeUtils.nameOf(
                                    result.info.code,
                                )}`,
                            );
                            // If we get this close code and have never connected before,
                            // this means we are registered on the Mediator without knowing it.
                            // eslint-disable-next-line max-depth
                            if (
                                result.info.code ===
                                    CloseCode.EXPECTED_DEVICE_SLOT_STATE_MISMATCH &&
                                model.globalProperties
                                    .get(GlobalPropertyKey.LAST_MEDIATOR_CONNECTION)
                                    ?.get().view.value.date === undefined
                            ) {
                                systemDialog
                                    .open({
                                        type: 'connection-error',
                                        context: {
                                            error: 'device-slot-state-mismatch',
                                        },
                                    })
                                    .catch(assertUnreachable);
                            } else {
                                systemDialog
                                    .open({
                                        type: 'connection-error',
                                        context: {
                                            error: 'client-was-dropped',
                                        },
                                    })
                                    .catch(assertUnreachable);
                            }
                        }

                        this.disconnectAndDisableAutoConnect(result.info);
                        break;
                    case CloseCode.DEVICE_LIMIT_REACHED:
                    case CloseCode.DEVICE_ID_REUSED:
                    case CloseCode.REFLECTION_QUEUE_LENGTH_LIMIT_REACHED:
                        // TODO(DESK-487): Request user interaction to continue
                        this.disconnectAndDisableAutoConnect(result.info);
                        throw new Error(
                            `TODO(DESK-487): Connection closed, request user interaction to continue (code=${result.info.code}, reason=${result.info.reason})`,
                        );
                    case CloseCode.NORMAL:
                    case CloseCode.SERVER_SHUTDOWN:
                    case CloseCode.ABNORMAL_CLOSURE:
                    case CloseCode.CSP_CLOSED:
                    case CloseCode.CSP_UNABLE_TO_ESTABLISH:
                    case CloseCode.CSP_INTERNAL_ERROR:
                    case CloseCode.PROTOCOL_ERROR:
                    case CloseCode.TRANSACTION_TTL_EXCEEDED:
                    case CloseCode.UNEXPECTED_ACK:
                    case CloseCode.CLIENT_TIMEOUT:
                    case CloseCode.INTERNAL_ERROR:
                    case CloseCode.WEBSOCKET_UNABLE_TO_ESTABLISH:
                        // Recoverable close case: Let client continue with standard reconnect logic.
                        this._log.info(
                            `Connection closed with code ${
                                CloseCodeUtils.nameOf(result.info.code) ?? '<unknown>'
                            } (code=${result.info.code}, reason=${result.info.reason})`,
                        );
                        break;
                    default:
                        unreachable(result.info.code);
                }
            } else if (result.info.code >= 4100 && result.info.code < 4200) {
                this.disconnectAndDisableAutoConnect(result.info);
                // TODO(DESK-487): Request user interaction to continue?
                throw new Error(
                    `Connection closed with unrecoverable unknown close code (code=${result.info.code}, reason=${result.info.reason})`,
                );
            } else {
                this._log.warn(
                    `Connection closed with recoverable unknown code (code=${result.info.code}, reason=${result.info.reason})`,
                );
            }

            if (skipConnectionDelay) {
                continue;
            }

            if (!result.wasConnected) {
                // When we weren't connected, we wait **exactly** 5s before making another attempt,
                // regardless on how long the connection took.
                this._log.debug(
                    'Last connection did not fulfill both handshakes. Waiting 5s before making another connection attempt',
                );
                await TIMER.sleep(reconnectionDelayMs);
            } else {
                let waitMs;
                // If we got a hint for how long to wait, apply it here.
                if (result.disconnectForMs !== undefined) {
                    waitMs = result.disconnectForMs;
                } else {
                    // When we were connected, we ensure that the total wait time does not exceed 5s
                    // between connection attempts.
                    waitMs = clamp(reconnectionDelayMs - elapsedMs, {
                        min: 0,
                        max: reconnectionDelayMs,
                    });
                }
                this._log.debug(
                    `Waiting ${(waitMs / 1000).toFixed(
                        1,
                    )}s before making another connection attempt`,
                );
                await TIMER.sleep(waitMs);
            }
        }
    }

    private async *_connectAndWaitUntilClosed(): AsyncGenerator<ConnectionResult, void> {
        // Attempt to connect
        this._log.info('Connecting');
        const taskManager = this._services.taskManager.replace(
            this.state.reset(ConnectionState.CONNECTING),
        );
        assert(taskManager instanceof ConnectedTaskManager);
        assert(this.state.get() === ConnectionState.CONNECTING);
        assert(this.leaderState.get() === D2mLeaderState.NONLEADER);
        let connection: Connection;
        try {
            connection = await Connection.create(
                this._services,
                this,
                taskManager,
                this._getCaptureHandlers,
            );
        } catch (error) {
            this._log.warn(
                'Could not create connection',
                extractErrorTraceback(ensureError(error)),
            );
            this._services.taskManager.replace(this.state.set(ConnectionState.DISCONNECTED));
            this.leaderState.reset(D2mLeaderState.NONLEADER);
            yield {
                connected: false,
                wasConnected: false,
                info: {
                    code: CloseCode.WEBSOCKET_UNABLE_TO_ESTABLISH,
                    origin: 'unknown',
                },
            };
            return;
        }
        this._connection = connection;

        // Create promises
        const connectedPromise = new ResolvablePromise<ConnectionResultConnected>({
            uncaught: 'default',
        });
        const disconnectedPromise = connection.closing.promise
            .then(async ({info, done, disconnectForMs}) => {
                await done;
                return {info, disconnectForMs};
            })
            .then(
                ({info, disconnectForMs}): ConnectionResultDisconnected => ({
                    connected: false,
                    wasConnected: connectedPromise.done,
                    info,
                    disconnectForMs,
                }),
            );

        // Subscribe to connection states
        const unsubscribeState = connection.state.subscribe((state) => {
            this.state.set(state);
            if (state === ConnectionState.CONNECTED) {
                connectedPromise.resolve({connected: true});
            }
        });
        const unsubscribeLeaderState = connection.leaderState.subscribe((state) =>
            this.leaderState.set(state),
        );

        // Wait until fully connected or closed
        this._log.info('Connected to server, waiting until fully connected or closed');
        try {
            const result = await Promise.race([connectedPromise, disconnectedPromise]);
            if (result.connected) {
                yield result;
            }
        } catch (error) {
            this._log.error(
                'Connection result promise failed',
                extractErrorTraceback(ensureError(error)),
            );
            // We'll just continue here in this case
        }

        // Continue waiting until closed
        this._log.info('Waiting until closed');
        let result: ConnectionResultDisconnected;
        try {
            result = await disconnectedPromise;
        } catch (error) {
            this._log.error(
                'Connection disconnected promise failed',
                extractErrorTraceback(ensureError(error)),
            );
            result = {
                connected: false,
                info: {code: CloseCode.INTERNAL_ERROR, origin: 'unknown'},
                wasConnected: connectedPromise.done,
            };
        }
        unsubscribeState();
        unsubscribeLeaderState();
        this._reset();
        yield result;
    }

    private _reset(): void {
        this._services.taskManager.replace(this.state.set(ConnectionState.DISCONNECTED));
        this.leaderState.reset(D2mLeaderState.NONLEADER);
        this._connection = undefined;
    }

    /**
     * Starts a D2M only connection to the mediator server (without CSP-proxying) and unlinks the
     * current device.
     *
     * Unlinking the current device will lead to the connections being closed. On failure,
     * auto-reconnect is turned on.
     *
     * WARNING: In general, this function should only be called if the connection is closed by the
     * chat server to give the user the option to relink cleanly anyway.
     */
    private async _startD2mOnlyConnectionAndUnlink(): Promise<CloseInfo> {
        this.disconnectAndDisableAutoConnect();

        assert(
            this._connection === undefined,
            'Connection must be torn down before connecting to the mediator server',
        );

        try {
            this._connection = await Connection.createD2mOnly(
                this._services,
                this._getCaptureHandlers,
            );
            const disconnectedPromise = this._connection.closing.promise.then(
                async ({info, done}) => {
                    await done;
                    return info;
                },
            );
            return await disconnectedPromise;
        } catch (error) {
            this._log.warn(
                'Could not create connection',
                extractErrorTraceback(ensureError(error)),
            );
            this._reset();

            // Turn on auto-connect again in case the device cannot be kicked because there is no
            // connection.
            this.enableAutoConnect();
            throw new Error('Failed to create D2m pipeline.');
        }
    }
}
