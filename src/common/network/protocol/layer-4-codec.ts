/**
 * Layer 4: Connection monitoring and keep-alive.
 *
 * - Sends CSP echo requests and handles CSP echo replies.
 */
import type {ServicesForBackend} from '~/common/backend';
import type {Logger} from '~/common/logging';
import * as structbuf from '~/common/network/structbuf';
import * as struct from '~/common/network/structbuf/bridge';
import type {u53} from '~/common/types';
import type {
    CodecEnqueuer,
    CodecEnqueuerHandle,
    TransformerCodec,
    TransformerCodecController,
} from '~/common/utils/codec';
import type {Delayed} from '~/common/utils/delayed';
import {dateToUnixTimestampMs} from '~/common/utils/number';
import type {TimerCanceller} from '~/common/utils/timer';

import {CloseCode} from '..';

import type {RawCaptureHandler} from './capture';
import type {ConnectionHandle} from './controller';

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
    readonly connection: Delayed<ConnectionHandle>;

    /**
     * Chat Server Protocol releated properties.
     */
    readonly csp: {
        /**
         * Echo request interval in seconds.
         */
        readonly echoRequestIntervalS: u53;

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
         * If no echo request has been received from the server within this timespan, we will
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

export class Layer4Decoder implements TransformerCodec<InboundL3Message, InboundL4Message> {
    private readonly _log: Logger;

    public constructor(
        services: ServicesForBackend,
        private readonly _encoder: CodecEnqueuer<OutboundL3Message>,
        private readonly _ongoingEchoRequests: TimerCanceller[],
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._log = services.logging.logger('network.protocol.l4.decoder');
    }

    public transform(
        message: InboundL3Message,
        controller: TransformerCodecController<InboundL4Message>,
    ): void {
        // Handle CSP or D2M message
        if (message.type === D2mPayloadType.PROXY) {
            this._handleCspMessage(message, controller);
        } else {
            controller.enqueue(message);
        }
    }

    private _handleCspMessage(
        message: InboundL3CspMessage,
        controller: TransformerCodecController<InboundL4Message>,
    ): void {
        const {payload} = message;
        switch (payload.type) {
            case CspPayloadType.ECHO_REQUEST: {
                // Echo the enclosed data
                this._capture?.(message);
                this._encoder.enqueue({
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
                this._log.debug(
                    `CSP RTT: ${elapsedMs}ms (${this._ongoingEchoRequests.length} ongoing echo requests)`,
                );
                break;
            }

            default:
                // Forward
                controller.enqueue({type: message.type, payload});
        }
    }
}

export class Layer4Encoder implements TransformerCodec<OutboundL4Message, OutboundL3Message> {
    private readonly _log: Logger;

    public constructor(
        private readonly _services: ServicesForBackend,
        private readonly _controller: Layer4Controller,
        private readonly _handle: CodecEnqueuerHandle<OutboundL3Message>,
        private readonly _ongoingEchoRequests: TimerCanceller[],
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._log = _services.logging.logger('network.protocol.l4.encoder');
    }

    public start(controller: TransformerCodecController<OutboundL3Message>): void {
        const {timer} = this._services;
        const {csp, connection} = this._controller;

        // Set handle for enqueuing messages from the decoder
        this._handle.enqueue = controller.enqueue.bind(controller);

        // Wait until authenticated towards CSP
        void csp.authenticated.then(() => {
            // Cancel all ongoing echo requests when the connection has been closed
            connection
                .unwrap()
                .closed.finally(() => {
                    for (;;) {
                        const canceller = this._ongoingEchoRequests.shift();
                        if (canceller === undefined) {
                            break;
                        }
                        canceller();
                    }
                })
                .catch(() => {
                    /* Ignore */
                });

            // Send an echo request in the requested interval with a timestamp to
            // measure RTT.
            this._log.debug('Starting echo timer');
            timer.repeat((canceller) => {
                const now = dateToUnixTimestampMs(new Date());
                try {
                    const message: OutboundL3Message = {
                        type: D2mPayloadType.PROXY,
                        payload: {
                            type: CspPayloadType.ECHO_REQUEST,
                            payload: struct.encoder(structbuf.csp.payload.EchoRequest, {
                                data: struct.encoder(structbuf.extra.monitoring.RttMeasurement, {
                                    timestamp: now,
                                }),
                            }),
                        },
                    };
                    this._capture?.(message, {info: 'EchoRequest'});
                    controller.enqueue(message);
                    this._ongoingEchoRequests.push(
                        timer.timeout(() => {
                            this._log.info(
                                'Considering connection lost due to echo request exceeding client timeout',
                            );
                            connection.unwrap().disconnect({
                                code: CloseCode.CLIENT_TIMEOUT,
                                clientInitiated: true,
                            });
                        }, csp.clientIdleTimeoutS * 1000),
                    );
                } catch {
                    // Readable side has likely been closed and this pipeline
                    // abandoned, so stopping the timer.
                    this._log.debug('Cancelling echo timer');
                    canceller();
                }
            }, csp.echoRequestIntervalS * 1000);

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
            controller.enqueue(message);
        });
    }

    public transform(
        message: OutboundL4Message,
        controller: TransformerCodecController<OutboundL3Message>,
    ): void {
        // Passthrough
        controller.enqueue(message);
    }
}
