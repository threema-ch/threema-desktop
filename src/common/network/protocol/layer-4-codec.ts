/**
 * Layer 4: Connection monitoring and keep-alive.
 *
 * This is where the chat server payloads are handled.
 *
 * - Sends CSP echo requests and handles CSP echo replies.
 * - Handles server alerts.
 * - Handles connection errors.
 */
import type {ServicesForBackend} from '~/common/backend';
import type {Logger} from '~/common/logging';
import * as structbuf from '~/common/network/structbuf';
import * as struct from '~/common/network/structbuf/bridge';
import type {DeviceCookie} from '~/common/network/types';
import type {SystemDialogHandle} from '~/common/system-dialog';
import type {u53} from '~/common/types';
import {UTF8, type SyncTransformerCodec} from '~/common/utils/codec';
import type {Delayed} from '~/common/utils/delayed';
import type {RemoteProxy} from '~/common/utils/endpoint';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import {TIMER, type TimerCanceller} from '~/common/utils/timer';

import {CloseCode} from '..';

import type {RawCaptureHandler} from './capture';
import type {ConnectionController} from './controller';

import {
    CspPayloadType,
    D2mPayloadType,
    type InboundL3CspMessage,
    type InboundL3Message,
    type InboundL4Message,
    type OutboundL3Message,
    type OutboundL4Message,
} from '.';

/**
 * Properties needed to keep the connection towards the Chat Server alive.
 */
export interface Layer4Controller {
    readonly connection: Pick<ConnectionController, 'manager' | 'current' | 'closing'>;

    /**
     * Chat Server Protocol releated properties.
     */
    readonly csp: {
        /**
         * Echo request interval in seconds.
         */
        readonly echoRequestIntervalS: u53;

        /**
         * Device Cookie.
         *
         * If a device cookie change indicator is sent from the server, the user is notified
         * that somebody else might have logged in from another device to this Identity.
         * At some point in time, the device cookie will be made mandatory (coming with essential data), enforcing a relink.
         * TODO(DESK-1344)
         */
        readonly deviceCookie: DeviceCookie | undefined;

        /**
         * Server idle timeout interval in seconds.
         *
         * If no message is sent to the server within this timespan, the server will disconnect the
         * client. Therefore, the echo request interval should be at most half of the idle timeout.
         *
         * IMPORTANT: The minimum server idle timeout is 30 seconds or the chat server will
         *            terminate the connection immediately!
         */
        readonly serverIdleTimeoutS: u53;

        /**
         * Client idle timeout interval in seconds.
         *
         * If no echo response has been received from the server within this timespan, we will
         * consider the connection stalled. The average waiting time until we discover that the
         * connection has been severed will be `(echoRequestIntervalS + clientIdleTimeoutS) / 2`.
         */
        readonly clientIdleTimeoutS: u53;

        /**
         * Resolves once the authentication process has been completed.
         */
        readonly authenticated: Promise<void>;
    };
}

export class Layer4Decoder implements SyncTransformerCodec<InboundL3Message, InboundL4Message> {
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _controller: Layer4Controller,
        private readonly _encoder: Delayed<{
            readonly forward: (message: OutboundL3Message) => void;
        }>,
        private readonly _ongoingEchoRequests: TimerCanceller[],
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._log = _services.logging.logger('network.protocol.l4.decoder');
    }

    public transform(
        message: InboundL3Message,
        forward: (message: InboundL4Message) => void,
    ): void {
        // Handle CSP or D2M message
        if (message.type === D2mPayloadType.PROXY) {
            this._handleCspMessage(message, forward);
        } else {
            forward(message);
        }
    }

    private _handleCspMessage(
        message: InboundL3CspMessage,
        forward: (message: InboundL4Message) => void,
    ): void {
        const {payload} = message;
        switch (payload.type) {
            case CspPayloadType.ECHO_REQUEST: {
                // Echo the enclosed data
                this._capture?.(message);
                this._encoder.unwrap().forward({
                    type: D2mPayloadType.PROXY,
                    payload: {
                        type: CspPayloadType.ECHO_RESPONSE,
                        payload: struct.encoder(structbuf.csp.payload.EchoResponse, {
                            data: payload.payload.data.slice(),
                        }),
                    },
                });
                break;
            }

            case CspPayloadType.ECHO_RESPONSE: {
                // We assume a timestamp is present, indicating the time the echo
                // request has been made, so we can measure the full RTT with
                // processing overhead.
                const reference = structbuf.extra.monitoring.RttMeasurement.decode(
                    payload.payload.data,
                );
                const elapsedMs = dateToUnixTimestampMs(new Date()) - reference.timestamp;
                this._capture?.(message, {info: `RTT: ${elapsedMs}ms`});
                const canceller = this._ongoingEchoRequests.shift();
                if (canceller === undefined) {
                    this._log.warn('Got an echo response without a corresponding echo request');
                } else {
                    canceller();
                }
                if (import.meta.env.VERBOSE_LOGGING.NETWORK) {
                    this._log.debug(
                        `CSP RTT: ${elapsedMs}ms (${this._ongoingEchoRequests.length} ongoing echo requests)`,
                    );
                }
                break;
            }

            case CspPayloadType.ALERT: {
                try {
                    const text = UTF8.decode(payload.payload.message);
                    this._log.warn(`Incoming server alert: ${text}`);
                    this._showAlert(text).catch((error: unknown) => {
                        this._log.error(`Failed to show server alert system dialog: ${error}`);
                    });
                } catch (error) {
                    this._log.error(`Incoming server alert with invalid UTF-8`);
                }
                break;
            }

            case CspPayloadType.CLOSE_ERROR: {
                // Show error and disable auto-reconnect until the dialog has been closed.
                let text;
                try {
                    text = UTF8.decode(payload.payload.message);
                    this._log.warn(`Incoming server alert: ${text}`);
                } catch (error) {
                    this._log.error(`Incoming server alert with invalid UTF-8`);
                    return;
                }
                if (payload.payload.canReconnect === 0) {
                    this._controller.connection.manager.disconnectAndDisableAutoConnect({
                        code: CloseCode.PROTOCOL_ERROR,
                        reason: `Closing connection due to CSP close-error message`,
                        origin: 'remote',
                    });
                }

                // TODO(DESK-1582): Depending on the dialog, we'll get 'confirmed' | 'dismissed'
                // here but this makes no sense because sometimes, the server alert dialog only
                // shows OK as an option.
                this._showAlert(text)
                    .then(async (handle) => {
                        this._log.info('Showing close error server alert');
                        const result = await handle.closed;
                        // Confirmed here is a bit misleading, but it means that the user chose to
                        // try to reconnect.
                        if (result === 'confirmed') {
                            this._controller.connection.manager.enableAutoConnect();
                        }
                    })
                    .catch((error: unknown) => {
                        this._log.error(`Failed to show server error system dialog: ${error}`);
                    });
                return;
            }

            case CspPayloadType.DEVICE_COOKIE_CHANGED_INDICATION: {
                // TODO(DESK-1344) Remove this conditional as soon as we make the device cookie mandatory.
                // For now, we only handle this message only when the device cookie has already been installed once.
                if (this._controller.csp.deviceCookie !== undefined) {
                    this._log.info('Received DEVICE_COOKIE_CHANGED_INDICATION message');
                    this._controller.connection.manager.disconnectAndDisableAutoConnect();
                    this._showDeviceCookieMismatchDialog()
                        .then(() => {
                            this._log.info('Showing device cookie change dialog');
                            // Do nothing here as the dialog is either closed without restarting the
                            // connection or the user relinks the app.

                            // TODO(DESK-1587): Wait for the confirmed signal here to trigger
                            // reconnection in standalone clients.
                        })
                        .catch((error: unknown) => {
                            this._log.error(
                                `Failed to show device cookie mismatch system dialog: ${error}`,
                            );
                        });
                } else {
                    this._log.warn(
                        'Received DEVICE_COOKIE_CHANGED_INDICATION, but no device cookie is available',
                    );
                }

                break;
            }

            default:
                // Forward
                forward({type: message.type, payload});
        }
    }

    /**
     * Show server alert system dialog.
     */
    private async _showAlert(text: string): Promise<RemoteProxy<SystemDialogHandle>> {
        return await this._services.systemDialog.open({
            type: 'server-alert',
            context: {text},
        });
    }

    /**
     * Show device cookie mismatch dialog.
     */
    private async _showDeviceCookieMismatchDialog(): Promise<RemoteProxy<SystemDialogHandle>> {
        return await this._services.systemDialog.open({
            type: 'device-cookie-mismatch',
        });
    }
}

export class Layer4Encoder implements SyncTransformerCodec<OutboundL4Message, OutboundL3Message> {
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _controller: Layer4Controller,
        private readonly _encoder: Delayed<{
            readonly forward: (message: OutboundL3Message) => void;
        }>,
        private readonly _ongoingEchoRequests: TimerCanceller[],
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._log = _services.logging.logger('network.protocol.l4.encoder');
    }

    public start(forward: (message: OutboundL3Message) => void): void {
        const {csp, connection} = this._controller;

        // Set encoder for forwarding messages from the decoder
        this._encoder.set({forward});

        // Wait until authenticated towards CSP
        csp.authenticated
            .then(() => {
                // Cancel all ongoing echo requests when the connection is closing/closed
                connection.current.unwrap().closing.subscribe(() => {
                    for (;;) {
                        const canceller = this._ongoingEchoRequests.shift();
                        if (canceller === undefined) {
                            break;
                        }
                        canceller();
                    }
                });

                // Send an echo request in the requested interval with a timestamp to
                // measure RTT.
                this._log.debug('Starting echo timer');
                this._controller.connection.closing.subscribe(
                    TIMER.repeat(
                        (canceller) => {
                            const now = dateToUnixTimestampMs(new Date());
                            try {
                                const message: OutboundL3Message = {
                                    type: D2mPayloadType.PROXY,
                                    payload: {
                                        type: CspPayloadType.ECHO_REQUEST,
                                        payload: struct.encoder(structbuf.csp.payload.EchoRequest, {
                                            data: struct.encoder(
                                                structbuf.extra.monitoring.RttMeasurement,
                                                {
                                                    timestamp: now,
                                                },
                                            ),
                                        }),
                                    },
                                };
                                this._capture?.(message, {info: 'EchoRequest'});
                                forward(message);
                                this._ongoingEchoRequests.push(
                                    TIMER.timeout(() => {
                                        this._log.info(
                                            'Considering connection lost due to echo request exceeding client timeout',
                                        );
                                        connection.current.unwrap().disconnect({
                                            code: CloseCode.CLIENT_TIMEOUT,
                                            origin: 'local',
                                        });
                                    }, csp.clientIdleTimeoutS * 1000),
                                );
                            } catch (error) {
                                this._log.error('Cancelling echo timer due to an error', error);
                                canceller();
                            }
                        },
                        csp.echoRequestIntervalS * 1000,
                        'after-interval',
                    ),
                );

                // Set connection idle timeout
                const message: OutboundL3Message = {
                    type: D2mPayloadType.PROXY,
                    payload: {
                        type: CspPayloadType.SET_CONNECTION_IDLE_TIMEOUT,
                        payload: struct.encoder(structbuf.csp.payload.SetConnectionIdleTimeout, {
                            timeout: csp.serverIdleTimeoutS,
                        }),
                    },
                };
                this._capture?.(message, {info: 'SetConnectionIdleTimeout'});
                forward(message);
            })
            .catch(() => {
                // We could explicitly disconnect here but the connection will probably have
                // failed at this point anyways.
            });
    }

    public transform(
        message: OutboundL4Message,
        forward: (message: OutboundL3Message) => void,
    ): void {
        // Passthrough
        forward(message);
    }
}
