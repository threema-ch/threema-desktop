import type {ServicesForBackend} from '~/common/backend';
import type {
    MediaCryptoHandleForBackend,
    RawGroupCallKeyHash,
    RawParticipantCallMediaKeyState,
} from '~/common/crypto/group-call';
import type {MediaCryptoMainThreadHandle, MediaCryptoInit} from '~/common/dom/crypto/group-call';
import {ensureEndpoint} from '~/common/dom/utils/endpoint';
import {
    UnboundedFlowControlledDataChannel,
    ReplaceableDataChannelMessageListener,
} from '~/common/dom/webrtc';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import {type S2pHello, S2P_ENVELOPE_SCHEMA} from '~/common/network/protobuf/validate/group-call';
import {
    GroupCallError,
    type GroupCallId,
    type ParticipantId,
} from '~/common/network/protocol/call/group-call';
import type {Mutable, u53} from '~/common/types';
import {assert, assertUnreachable, ensureError, unwrap} from '~/common/utils/assert';
import {hexWithSeparatorToBytes} from '~/common/utils/byte';
import {PROXY_HANDLER, type ProxyEndpoint, type RemoteProxy} from '~/common/utils/endpoint';
import type {AbortListener, AbortRaiser} from '~/common/utils/signal';
import {type DtlsFingerprint, ensureDtlsFingerprint} from '~/common/webrtc';
import {
    type GroupCallContext,
    type AnyGroupCallContextAbort,
    DATA_CHANNEL_PARAMETERS,
    getMids,
    CAMERA_ENCODINGS,
    type GroupCallConnectionHandle,
} from '~/common/webrtc/group-call';

export interface ParticipantTransceivers {
    readonly microphone: RTCRtpTransceiver;
    readonly camera: RTCRtpTransceiver;
}

interface LocalParticipant {
    readonly id: ParticipantId;
    readonly transceivers: ParticipantTransceivers;
}

interface RemoteParticipant {
    readonly id: ParticipantId;
    readonly transceivers: ParticipantTransceivers;
}

interface ConnectionContext {
    readonly pc: RTCPeerConnection;
    readonly p2s: {
        readonly dc: UnboundedFlowControlledDataChannel;
        readonly listener: ReplaceableDataChannelMessageListener;
    };
    readonly mediaCryptoHandle: RemoteProxy<MediaCryptoMainThreadHandle>;
    readonly backendHandle: RemoteProxy<GroupCallConnectionHandle>;
    readonly local: LocalParticipant;
    readonly remote: Map<ParticipantId, RemoteParticipant>;
}

/**
 * Handle to the {@link GroupCallContextProvider} providing only necessary properties needed in the
 * UI.
 */
export interface GroupCallContextHandle {
    readonly local: LocalParticipant;
    readonly remote: ReadonlyMap<ParticipantId, RemoteParticipant>;
}

export class GroupCallContextProvider implements GroupCallContext {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    private readonly _log: Logger;
    private _certificate: RTCCertificate | undefined;
    private _connection: ConnectionContext | undefined;

    public constructor(
        private readonly _services: Pick<ServicesForBackend, 'endpoint' | 'logging'>,
        private readonly _callId: GroupCallId,
        private readonly _abort: AbortRaiser<AnyGroupCallContextAbort>,
    ) {
        this._log = _services.logging.logger(
            `group-call.context-provider.${this._callId.shortened}`,
        );
        this._log.debug(`Created (id=${_callId.id})`);
    }

    public get abort(): AbortListener<AnyGroupCallContextAbort> {
        return this._abort;
    }

    public async certificate(): Promise<DtlsFingerprint> {
        assert(
            this._certificate === undefined,
            'certificate() called with an existing certificate',
        );
        try {
            // Generate certificate
            this._log.debug('Creating certificate');
            const certificate = await RTCPeerConnection.generateCertificate({
                name: 'ECDSA',
                namedCurve: 'P-256',
            });

            // Get fingerprint
            let fingerprintString;
            if (
                (certificate.getFingerprints as RTCCertificate['getFingerprints'] | undefined) !==
                undefined
            ) {
                [fingerprintString] = certificate.getFingerprints();
                assert(fingerprintString !== undefined);
                if (fingerprintString.algorithm !== 'sha-256') {
                    throw new Error(`Expecting SHA-256 certificate fingerprint`);
                }
                fingerprintString = fingerprintString.value;
            } else {
                // SOME browsers don't have this API, so we have to create a peer connection and extract
                // it from the offer. SO SIMPLE, RIGHT!
                const pc = new RTCPeerConnection({
                    certificates: [certificate],
                    encodedInsertableStreams: false,
                });
                const offer = await pc.createOffer();
                const match = unwrap(offer.sdp).match(
                    /a=fingerprint:sha-256 (?<fingerprint>[^\r\n ]+)/u,
                );
                fingerprintString = match?.groups?.fingerprint;
                pc.close();
            }
            if (fingerprintString === undefined) {
                throw new Error('Unable to determine certificate fingerprint');
            }
            const fingerprint = ensureDtlsFingerprint(
                hexWithSeparatorToBytes(fingerprintString, 1),
            );

            // Store
            this._certificate = certificate;
            return fingerprint;
        } catch (error) {
            this._log.error('Creating certificate failed', error);
            this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
            throw error;
        }
    }

    public async connect(
        gckh: RawGroupCallKeyHash,
        local: ParticipantId,
        offerSdp: string,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        iceCandidates: readonly {readonly candidate: string; readonly sdpMLineIndex: u53}[],
        endpoints: {
            readonly connection: ProxyEndpoint<GroupCallConnectionHandle>;
            readonly mediaCrypto: ProxyEndpoint<MediaCryptoHandleForBackend>;
        },
        initialLocalPcmk: RawParticipantCallMediaKeyState,
    ): Promise<S2pHello> {
        assert(this._certificate !== undefined, 'connect() called without an existing certificate');
        assert(this._connection === undefined, 'connect() called with an existing connection');
        const aborted = this._abort.promise.then((event) => {
            const message = `Connection was aborted (origin=${event.cause}, cause=${event.origin})`;
            this._log.info(message);
            throw new GroupCallError({kind: 'webrtc-connect'}, message);
        });

        try {
            // Create peer connection
            this._log.debug('Creating peer connection');
            const pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: 'all',
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
                certificates: [this._certificate],
                encodedInsertableStreams: true,
            });
            if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                pc.addEventListener('negotiationneeded', () =>
                    this._log.debug('Negotiation needed'),
                );
            }
            pc.addEventListener('icecandidateerror', (event) =>
                this._log.warn('Candidate error', event),
            );
            if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                pc.addEventListener('signalingstatechange', () =>
                    this._log.debug(`Signaling state: ${pc.signalingState}`),
                );
            }
            pc.addEventListener('iceconnectionstatechange', () => {
                this._log.debug(`ICE connection state: ${pc.iceConnectionState}`);
                if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                    this._log.info(`Closed (by ICE connection state '${pc.iceConnectionState}')`);
                    this._abort.raise({origin: 'main-thread', cause: 'disconnected'});
                }
            });
            if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                pc.addEventListener('icegatheringstatechange', () =>
                    this._log.debug(`ICE gathering state: ${pc.iceGatheringState}`),
                );
            }
            pc.addEventListener('connectionstatechange', () => {
                this._log.debug(`Connection state: ${pc.connectionState}`);
                if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                    this._log.info(`Closed (by connection state '${pc.connectionState}')`);
                    this._abort.raise({origin: 'main-thread', cause: 'disconnected'});
                }
            });

            pc.addEventListener('iceconnectionstatechange', () => {
                if (this._abort.aborted || pc.iceConnectionState !== 'disconnected') {
                    return;
                }
                this._log.debug('Scheduling ICE restart');
                this._connection?.backendHandle.triggerIceRestart().catch((error: unknown) => {
                    this._log.error('Restarting ice failed', error);
                    this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
                });
            });

            // Add P2S data channel
            let p2s: ConnectionContext['p2s'];
            {
                const dc = new UnboundedFlowControlledDataChannel(
                    this._abort.derive({
                        local: () => undefined,
                        remote: () => ({origin: 'main-thread', cause: 'unexpected-error'}),
                    }),
                    this._log,
                    pc.createDataChannel('p2s', {
                        ordered: true,
                        negotiated: true,
                        id: DATA_CHANNEL_PARAMETERS.STREAM_ID.P2S,
                    }),
                );
                const listener = new ReplaceableDataChannelMessageListener(dc.dc);
                dc.dc.addEventListener(
                    'open',
                    () => {
                        this._log.debug(`Channel '${dc.dc.label}' open`);
                    },
                    {once: true},
                );
                dc.dc.addEventListener(
                    'close',
                    () => {
                        if (this._abort.aborted) {
                            return;
                        }
                        this._log.debug(`Channel '${dc.dc.label}' closed`);
                        this._abort.raise({origin: 'main-thread', cause: 'disconnected'});
                    },
                    {once: true},
                );
                p2s = {
                    dc,
                    listener,
                };
            }

            // Create media crypto worker
            //
            // Note: For efficiency reasons, we need to start the `Worker` from the main thread. The
            // `RTCRtpScriptTransform` (we don't use it right now but we will eventually) requires to
            // supply a worker for construction. This is because the transform stream is most efficient
            // at the place it was created. In other words, while we could send the stream into another
            // `Worker` context, it can be vastly inefficient to do so.
            this._log.debug('Creating media crypto worker');
            const mediaCryptoWorker = new Worker(
                new URL('../../../worker/backend/media-crypto-worker.ts', import.meta.url),
                {
                    name: 'Media Crypto Worker',
                    type: import.meta.env.DEBUG ? 'module' : 'classic',
                },
            );
            mediaCryptoWorker.addEventListener(
                'error',
                (event) => {
                    this._log.error("Closed (by media crypto worker 'error')", event.error);
                    this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
                },
                {once: true},
            );
            mediaCryptoWorker.addEventListener(
                'messageerror',
                (event) => {
                    this._log.error("Closed (by media crypto worker 'messageerror')", event.data);
                    this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
                },
                {once: true},
            );

            // Handle abort
            //
            // IMPORTANT: This must be done before any `await`!
            this._abort.subscribe((event) => {
                this._log.info('Aborted, cause:', event);
                this._connection = undefined;

                // Terminate media crypto worker
                this._log.debug('Terminating media crypto worker');
                mediaCryptoWorker.terminate();

                // Close any data channels and the peer connection
                this._log.debug('Closing peer connection');
                p2s.listener.replace(undefined);
                p2s.dc.dc.close();
                pc.close();
            });

            // Send the media crypto worker the initial state including the backend endpoint and
            // then rewrap it for subsequent use as a proxy.
            //
            // Note: Creating the media crypto worker backend is async, so we need to wait for it to
            // be ready. This is signalled by an empty message.
            this._log.debug('Sending initial state to media crypto worker');
            {
                const interimEndpoint = ensureEndpoint<
                    'media-crypto',
                    MediaCryptoInit,
                    'init' | 'ready'
                >(mediaCryptoWorker);

                // Wait for the worker to signal that its initialising now
                await Promise.race([
                    aborted,
                    new Promise<void>((resolve) => {
                        interimEndpoint.addEventListener(
                            'message',
                            ({data}) => {
                                if (data === 'init') {
                                    resolve();
                                }
                            },
                            {once: true},
                        );
                    }),
                ]);

                // Worker 'closed' canary: We acquire the same lock as the worker currently holds,
                // so once we acquired it, we'll know that the worker closed.
                navigator.locks
                    .request('mcw', () => {
                        if (this._abort.aborted) {
                            return;
                        }
                        this._log.error('Closed (by media crypto worker closing)');
                        this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
                    })
                    .catch(assertUnreachable);

                // Send initial state
                interimEndpoint.postMessage(
                    {
                        backendEndpoint: endpoints.mediaCrypto,
                        callId: this._callId,
                        gckh,
                        initialLocalPcmk,
                    },
                    [
                        endpoints.mediaCrypto,
                        // Note: This effectively purges the PCMK from this endpoint
                        initialLocalPcmk.pcmk.buffer,
                    ],
                );

                // Wait for the worker to signal that it is ready
                await Promise.race([
                    aborted,
                    new Promise<void>((resolve) => {
                        interimEndpoint.addEventListener(
                            'message',
                            ({data}) => {
                                if (data === 'ready') {
                                    resolve();
                                }
                            },
                            {once: true},
                        );
                    }),
                ]);
            }
            const mediaCryptoHandle = this._services.endpoint.wrap<MediaCryptoMainThreadHandle>(
                ensureEndpoint(mediaCryptoWorker),
                this._services.logging.logger('com.mt.media-crypto-provider'),
            );

            // Create and apply offer
            {
                const offer = {type: 'offer', sdp: offerSdp} as const;
                this._log.debug('Offer', offer);
                await pc.setRemoteDescription(offer);
            }

            // Get all current transceivers
            const transceivers: Partial<Mutable<ParticipantTransceivers>> = {};
            {
                const unmapped = new Map(
                    pc.getTransceivers().map((transceiver) => {
                        if (transceiver.mid === null) {
                            throw new Error('Invalid transceiver, MID is null');
                        }
                        return [transceiver.mid, transceiver];
                    }),
                );

                // Remap all local transceivers
                const mids = getMids(local);
                for (const [type, mid] of Object.entries(mids)) {
                    if (type === 'data') {
                        continue;
                    }
                    assert(type === 'microphone' || type === 'camera');

                    // Ensure transceiver exists
                    const transceiver = unmapped.get(mid);
                    if (transceiver === undefined) {
                        throw new Error(`Local '${type}' transceiver not found`);
                    }

                    // Set direction to activate correctly
                    transceiver.direction = 'sendonly';

                    // For camera video, we need to set simulcast encoding
                    // parameters
                    if (type === 'camera') {
                        const parameters = transceiver.sender.getParameters();
                        parameters.encodings = [...CAMERA_ENCODINGS];
                        // eslint-disable-next-line no-await-in-loop
                        await transceiver.sender.setParameters(parameters);
                    }

                    // Store transceiver
                    transceivers[type] = transceiver;

                    // Add local stream to media encryptor
                    const encodedStream = transceiver.sender.createEncodedStreams();
                    await mediaCryptoHandle.encryptor.addStream(
                        this._services.endpoint.transfer(
                            {
                                mid,
                                codec: type === 'camera' ? 'vp8' : 'opus',
                                pair: encodedStream,
                            },
                            [encodedStream.readable, encodedStream.writable],
                        ),
                    );

                    // Mark it as mapped
                    assert(unmapped.delete(mid));
                }

                // Ensure there are no unmapped remaining transceivers
                if (unmapped.size !== 0) {
                    throw new Error(
                        `Unmapped transceiver MIDs: ${[...unmapped.keys()].join(', ')}`,
                    );
                }
            }

            // Create and apply answer
            {
                const answer = await pc.createAnswer();
                this._log.debug('Answer', answer);
                await pc.setLocalDescription(answer);
            }

            // Connect to the SFU
            await Promise.all(
                iceCandidates.map(async (candidate) => await pc.addIceCandidate(candidate)),
            );

            // Expect the SFU to send us the S2P 'hello' (which is our 'connected' signal).
            const s2pHello = await Promise.race([
                aborted,
                new Promise<S2pHello>((resolve, reject) => {
                    p2s.listener.replace((array) => {
                        try {
                            // Decode S2P envelope
                            const envelope = S2P_ENVELOPE_SCHEMA.parse(
                                protobuf.groupcall.SfuToParticipant.Envelope.decode(array),
                            );
                            if (envelope.content !== 'hello') {
                                reject(
                                    new Error(
                                        `Expected first S2P message to be the SFU 'hello', got '${envelope.action}'`,
                                    ),
                                );
                                return;
                            }

                            // We're connected!
                            p2s.listener.replace(undefined);
                            resolve(unwrap(envelope.hello));
                        } catch (error) {
                            this._log.error("Decoding S2P 'hello' failed", error);
                            reject(ensureError(error));
                        }
                    });
                }),
            ]);

            // From this point on any local abort events are forwarded to the backend and any
            // subsequent S2P messages, too.
            const backendHandle = this._services.endpoint.wrap<GroupCallConnectionHandle>(
                ensureEndpoint(endpoints.connection),
                this._services.logging.logger('com.mt.group-call-connection-handle'),
            );
            p2s.listener.replace((array) => {
                backendHandle
                    .handleP2s(this._services.endpoint.transfer(array, [array.buffer]))
                    .catch((error: unknown) => {
                        if (this._abort.aborted) {
                            return;
                        }
                        this._log.error('Handling P2S failed', error);
                        this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
                    });
            });

            // Store the connection context and hand out the S2P 'hello'
            this._log.info('Connected');
            this._connection = {
                pc,
                p2s,
                mediaCryptoHandle,
                backendHandle,
                local: {
                    id: local,
                    transceivers: {
                        microphone: unwrap(transceivers.microphone),
                        camera: unwrap(transceivers.camera),
                    },
                },
                remote: new Map(),
            };
            return s2pHello;
        } catch (error) {
            if (!this._abort.aborted) {
                this._log.error('Connecting failed', error);
                this._abort.raise({origin: 'main-thread', cause: 'unexpected-error'});
            }
            throw error;
        }
    }

    public sendP2s(arrays: readonly Uint8Array[]): void {
        if (this._abort.aborted) {
            this._log.warn('Unable to send a P2S message as the call is already aborted');
            return;
        }
        assert(this._connection !== undefined, 'p2s() called without an existing connection');
        for (const array of arrays) {
            this._connection.p2s.dc.send(array);
        }
    }

    public async restartIce(answerSdp: string): Promise<void> {
        if (this._abort.aborted) {
            this._log.warn('Unable to do an ICE restart as the call is already aborted');
            return;
        }
        assert(this._connection !== undefined, 'Connection must not be undefined');
        const {pc} = this._connection;

        const offer = await pc.createOffer({iceRestart: true});
        this._log.info('Offer (ICE restart)', offer);
        await pc.setLocalDescription(offer);

        const answer = {
            type: 'answer',
            sdp: answerSdp,
        } as const;
        this._log.info('Answer (ICE restart)', answer);
        await pc.setRemoteDescription(answer);
    }

    public async update(
        offerSdp: string,
        all: Set<ParticipantId>,
        change: {
            readonly removed: ReadonlySet<ParticipantId>;
            readonly added: ReadonlySet<ParticipantId>;
        },
    ): Promise<void> {
        if (this._abort.aborted) {
            this._log.warn('Unable to update call as the call is already aborted');
            return;
        }
        assert(this._connection !== undefined, 'update() called without an existing connection');
        const {pc, mediaCryptoHandle, local, remote} = this._connection;

        // Remove participants to be removed
        for (const participantId of change.removed) {
            // Remove the participant
            if (!remote.delete(participantId)) {
                this._log.warn(`Cannot remove participant ${participantId}, state does not exist`);
            }
        }

        // Create and apply offer
        {
            const offer = {type: 'offer', sdp: offerSdp} as const;
            this._log.debug('Offer', offer);
            await pc.setRemoteDescription(offer);
        }

        // Get all current transceivers
        const unmapped = new Map(
            pc.getTransceivers().map((transceiver) => {
                if (transceiver.mid === null) {
                    throw new Error('Invalid transceiver, MID is null');
                }
                return [transceiver.mid, transceiver];
            }),
        );

        // Remap all local transceivers
        {
            assert(all.delete(local.id));
            assert(!remote.has(local.id));
            assert(!change.added.has(local.id));
            assert(!change.removed.has(local.id));
            const mids = getMids(local.id);
            for (const [type, mid] of Object.entries(mids)) {
                if (type === 'data') {
                    continue;
                }
                assert(type === 'microphone' || type === 'camera');

                // Ensure transceiver matches the expected instance
                const transceiver = unmapped.get(mid);
                if (transceiver === undefined) {
                    throw new Error(`Local '${type}' transceiver not found`);
                }
                if (local.transceivers[type] !== transceiver) {
                    throw new Error(`Local '${type}' transceiver mismatch`);
                }

                // Mark it as mapped
                assert(unmapped.delete(mid));
            }
        }

        // Remap all existing remote participant transceivers
        for (const [participantId, state] of remote.entries()) {
            assert(all.delete(participantId));
            if (change.removed.has(participantId)) {
                continue;
            }
            assert(!change.added.has(participantId));
            const mids = getMids(participantId);
            for (const [type, mid] of Object.entries(mids)) {
                if (type === 'data') {
                    continue;
                }
                assert(type === 'microphone' || type === 'camera');

                // Ensure transceiver exists
                const transceiver = unmapped.get(mid);
                if (transceiver === undefined) {
                    throw new Error(`Remote '${type}' transceiver not found`);
                }

                // Ensure transceiver matches the expected instance
                if (state.transceivers[type] !== transceiver) {
                    throw new Error(`Remote '${type}' transceiver mismatch`);
                }

                // Mark it as mapped
                assert(unmapped.delete(mid));
            }
        }

        // Create all newly added (pending) remote participant transceivers
        for (const participantId of change.added) {
            assert(all.delete(participantId));
            assert(!remote.has(participantId));
            const mids = getMids(participantId);
            const transceivers: {
                -readonly [K in keyof ParticipantTransceivers]:
                    | ParticipantTransceivers[K]
                    | undefined;
            } = {microphone: undefined, camera: undefined};
            for (const [type, mid] of Object.entries(mids)) {
                if (type === 'data') {
                    continue;
                }
                assert(type === 'microphone' || type === 'camera');

                // Ensure transceiver exists
                const transceiver = unmapped.get(mid);
                if (transceiver === undefined) {
                    throw new Error(`Remote '${type}' transceiver not found`);
                }

                // First encounter: Set direction to activate correctly
                transceiver.direction = 'recvonly';

                // Set transceiver
                transceivers[type] = transceiver;

                // Add remote stream to media encryptor
                const encodedStream = transceiver.receiver.createEncodedStreams();
                await mediaCryptoHandle.decryptor.addStream(
                    participantId,
                    this._services.endpoint.transfer(
                        {
                            mid,
                            codec: type === 'camera' ? 'vp8' : 'opus',
                            pair: encodedStream,
                        },
                        [encodedStream.readable, encodedStream.writable],
                    ),
                );

                // Mark it as mapped
                assert(unmapped.delete(mid));
            }

            // Add remote participant
            remote.set(participantId, {
                id: participantId,
                transceivers: {
                    microphone: unwrap(transceivers.microphone),
                    camera: unwrap(transceivers.camera),
                },
            });
        }

        // Discard all inactive remote participant transceivers
        for (const participantId of all) {
            const mids = getMids(participantId);
            for (const [type, mid] of Object.entries(mids)) {
                if (type === 'data') {
                    continue;
                }
                assert(type === 'microphone' || type === 'camera');

                // Mark it as mapped
                unmapped.delete(mid);
            }
        }

        // Ensure there are no unmapped remaining transceivers
        if (unmapped.size !== 0) {
            throw new Error(`Unmapped transceiver MIDs: ${[...unmapped.keys()].join(', ')}`);
        }

        // Create and apply answer
        {
            const answer = await pc.createAnswer();
            this._log.debug('Answer', answer);
            await pc.setLocalDescription(answer);
        }
    }

    public handle(): GroupCallContextHandle {
        assert(this._connection !== undefined, 'handle() called without an existing connection');
        return {
            local: this._connection.local,
            remote: this._connection.remote,
        };
    }
}
