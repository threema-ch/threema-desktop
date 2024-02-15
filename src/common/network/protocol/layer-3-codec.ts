/**
 * Layer 3: Authentication and transport encryption layer.
 *
 * - Fulfilling the CSP and the D2M handshake, updating the authentication state.
 * - Transport layer encryption/decryption of CSP messages.
 * - Encoding/Decoding CSP message payloads and forwarding D2M messages.
 */
import type {ServicesForBackend} from '~/common/backend';
import {
    type EncryptedData,
    type EncryptedDataWithNonceAhead,
    ensurePublicKey,
    NONCE_UNGUARDED_SCOPE,
    type PlainData,
    type PublicKey,
} from '~/common/crypto';
import {hash} from '~/common/crypto/blake2b';
import {deriveVouchKey} from '~/common/crypto/csp-keys';
import type {DeviceGroupBoxes} from '~/common/crypto/device-group-keys';
import {randomPkcs7PaddingLength} from '~/common/crypto/random';
import {CspMessagePayloadVersion, D2mPayloadTypeUtils, GlobalPropertyKey} from '~/common/enum';
import {extractErrorMessage, ProtocolError} from '~/common/error';
import type {Logger} from '~/common/logging';
import {CloseCode} from '~/common/network/';
import * as protobuf from '~/common/network/protobuf';
import * as structbuf from '~/common/network/structbuf';
import type {
    ClientCookie,
    ClientSequenceNumber,
    ClientSequenceNumberValue,
    CspDeviceId,
    CspPayloadBox,
    D2mChallengeBox,
    D2mDeviceId,
    IdentityBytes,
    ServerCookie,
    ServerSequenceNumber,
} from '~/common/network/types';
import type {ClientKey, TemporaryClientKey, TemporaryServerKey} from '~/common/network/types/keys';
import type {ReadonlyUint8Array, u32, u53, WeakOpaque} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {byteEncodeSequence, byteEquals, bytePadPkcs7, byteToHex} from '~/common/utils/byte';
import {ByteBuffer} from '~/common/utils/byte-buffer';
import {UTF8, type SyncTransformerCodec} from '~/common/utils/codec';
import type {Delayed} from '~/common/utils/delayed';
import {intoUnsignedLong} from '~/common/utils/number';
import type {ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {MonotonicEnumStore} from '~/common/utils/store';

import type {RawCaptureHandler} from './capture';
import type {ConnectionHandle} from './controller';
import {CspAuthState, CspAuthStateUtils, D2mAuthState, D2mAuthStateUtils} from './state';

import {
    CspExtensionType,
    type CspMessage,
    type CspPayload,
    CspPayloadType,
    type D2mMessage,
    D2mPayloadType,
    type InboundL2CspMessage,
    type InboundL2D2mMessage,
    type InboundL2Message,
    type InboundL3CspMessage,
    type InboundL3Message,
    type LayerEncoder,
    type OutboundL2Message,
    type OutboundL3CspMessage,
    type OutboundL3D2mMessage,
    type OutboundL3Message,
} from '.';

type EncryptedDeviceInfo = WeakOpaque<
    EncryptedDataWithNonceAhead,
    {readonly EncryptedDeviceInfo: unique symbol}
>;

/**
 * UTF-8 encoded string: 'threema-clever-extension-field'
 */
// prettier-ignore
const CLEVER_EXTENSION_MAGIC = Uint8Array.from([
    0x74, 0x68, 0x72, 0x65, 0x65, 0x6d, 0x61, 0x2d,
    0x63, 0x6c, 0x65, 0x76, 0x65, 0x72, 0x2d, 0x65,
    0x78, 0x74, 0x65, 0x6e, 0x73, 0x69, 0x6f, 0x6e,
    0x2d, 0x66, 0x69, 0x65, 0x6c, 0x64
]);

const VOUCH_RESERVED1_BYTES = new Uint8Array(24);
const VOUCH_RESERVED2_BYTES = new Uint8Array(16);

const PAYLOAD_RESERVED_BYTES = new Uint8Array(3);

const D2M_PROTOCOL_VERSION = {
    /**
     * The minimal d2m protocol version required by this client.
     */
    MIN: 0,
    /**
     * The max d2m protocol version supported by this client.
     */
    MAX: 0,
} as const;

/**
 * Properties needed to perform both the Chat Server Protocol and the
 * Device to Mediator handshake.
 */
export interface Layer3Controller {
    readonly connection: Delayed<ConnectionHandle>;

    /**
     * Chat Server Protocol releated properties.
     */
    readonly csp: {
        /**
         * Client Key (32 bytes, permanent secret key associated to the Threema ID).
         */
        readonly ck: ClientKey;

        /**
         * Temporary Client Key (secret, 32 bytes).
         */
        readonly tck: TemporaryClientKey;

        /**
         * The client's Threema ID (8 chars).
         */
        readonly identity: IdentityBytes;

        /**
         * Client Connection Cookie (16 bytes, replaced for each
         * connection attempt).
         */
        readonly cck: ClientCookie;

        /**
         * The client's info string.
         */
        readonly info: string;

        /**
         * The client's device ID towards the chat server.
         */
        readonly deviceId: CspDeviceId;

        /**
         * Server Sequence Number, starting with `0`.
         */
        readonly ssn: ServerSequenceNumber;

        /**
         * Client Sequence Number, starting with `0`.
         */
        readonly csn: ClientSequenceNumber;

        /**
         * Server Connection Cookie (16 bytes), available after `server-hello`
         * has been received.
         */
        readonly sck: Delayed<ServerCookie, ProtocolError<'csp'>>;

        /**
         * Payload Box, available after `server-hello` has been received.
         *
         * Uses `TCK.secret` and `TSK.public`.
         */
        readonly box: Delayed<CspPayloadBox, ProtocolError<'csp'>>;

        /**
         * Current authentication state.
         */
        readonly state: MonotonicEnumStore<CspAuthState>;

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
         * The client's device ID towards the mediator server.
         */
        readonly deviceId: D2mDeviceId;

        /**
         * The client's device slot expiration policy.
         */
        readonly deviceSlotExpirationPolicy: protobuf.d2m.DeviceSlotExpirationPolicy;

        /**
         * The client's platform details (e.g. name and version of the renderer).
         */
        readonly platformDetails: string;

        /**
         * User-assigned label of the device.
         */
        readonly label: string;

        /**
         * Challenge Box, available after `ServerHello` has been received.
         *
         * Uses `DGPK.secret` and `ESK.public`.
         */
        readonly box: Delayed<D2mChallengeBox, ProtocolError<'d2m'>>;

        /**
         * Current authentication state.
         */
        readonly state: MonotonicEnumStore<D2mAuthState>;

        /**
         * Server info, resolved once `ServerInfo` has been received (after
         * the final authentication state).
         */
        readonly serverInfo: ResolvablePromise<protobuf.validate.d2m.ServerInfo.Type>;

        /**
         * Whether we were promoted to be the leader device.
         */
        readonly promotedToLeader: ResolvablePromise<void>;

        /**
         * Resolves once the `ReflectionQueueDry` messag has been received.
         */
        readonly reflectionQueueDry: ResolvablePromise<void>;

        /**
         * Resolves once the Protocol Version has been negotiated.
         */
        readonly protocolVersion: ResolvablePromise<u32>;
    } & Pick<DeviceGroupBoxes, 'dgdik' | 'dgpk'>;
}

type InternalInboundL3CspMessage = CspMessage<
    CspPayload<CspPayloadType.QUEUE_SEND_COMPLETE, structbuf.csp.payload.QueueSendComplete>
>;

export class Layer3Decoder implements SyncTransformerCodec<InboundL2Message, InboundL3Message> {
    private readonly _services: ServicesForBackend;
    private readonly _log: Logger;
    private readonly _buffer: ByteBuffer;
    private readonly _reserved = new Uint8Array(16);

    public constructor(
        services: ServicesForBackend,
        private readonly _controller: Layer3Controller,
        private readonly _encoder: Delayed<{
            readonly forward: (message: OutboundL2Message) => void;
        }>,
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._services = services;
        this._log = services.logging.logger('network.protocol.l3.decoder');
        this._buffer = new ByteBuffer(
            new Uint8Array(services.config.MEDIATOR_FRAME_MAX_BYTE_LENGTH),
        );
    }

    public transform(
        message: InboundL2Message,
        forward: (message: InboundL3Message) => void,
    ): void {
        // Reset the buffer with each incoming message
        this._buffer.reset();

        // Handle CSP or D2M message
        try {
            if (message.type === D2mPayloadType.PROXY) {
                this._handleCspMessage(message, forward);
            } else {
                this._handleD2mMessage(message, forward);
            }
        } catch (error) {
            this._capture?.(message, {
                error: error instanceof ProtocolError ? error : undefined,
            });
            throw ensureError(error);
        }
    }

    private _handleCspMessage(
        message: InboundL2CspMessage,
        forward: (message: InboundL3Message) => void,
    ): void {
        const {csp} = this._controller;
        const state = csp.state.get();
        switch (state) {
            case CspAuthState.COMPLETE: {
                // Decrypt and decode payload frame to a payload
                assert(
                    message.payload instanceof structbuf.csp.payload.Frame,
                    'Expected a CSP frame',
                );
                const payloadMessage = this._handleCspPayloadFrame(message, message.payload);
                if (payloadMessage === undefined) {
                    return;
                }
                forward(payloadMessage);
                break;
            }

            case CspAuthState.SERVER_HELLO: {
                // Decrypt and decode `server-hello` to a `server-challenge-response`
                assert(
                    message.payload instanceof structbuf.csp.handshake.ServerHello,
                    'Expected a CSP server-hello',
                );
                const serverHello = message.payload;
                const challengeResponse = this._handleCspServerHello(serverHello);

                // Validate the server cookie length
                if (serverHello.sck.byteLength !== 16) {
                    throw new ProtocolError(
                        'csp',
                        `Invalid server cookie length: ${serverHello.sck.byteLength}`,
                    );
                }

                // Verify the challenge response (i.e. the encrypted client
                // cookie equals the one we have sent, thereby proving that
                // the server has the corresponding secret key).
                if (!byteEquals(challengeResponse.cck, csp.cck)) {
                    throw new ProtocolError('csp', `Invalid challenge response (client cookie)`);
                }

                // Store the server cookie and a box for subsequent payloads
                const tsk = ensurePublicKey(challengeResponse.tsk) as TemporaryServerKey;
                csp.sck.set(serverHello.sck as ServerCookie);
                csp.box.set(csp.tck.getSharedBox(tsk, NONCE_UNGUARDED_SCOPE, undefined));

                // Encode, encrypt and enqueue `login`
                const loginMessage = this._createCspLogin(tsk);
                this._encoder.unwrap().forward(loginMessage);

                // Update state
                csp.state.set(CspAuthState.LOGIN_ACK);
                break;
            }

            case CspAuthState.LOGIN_ACK: {
                // Decrypt and decode `login-ack` to reserved bytes
                assert(
                    message.payload instanceof structbuf.csp.handshake.LoginAck,
                    'Expected a CSP login-ack',
                );
                const loginAck = message.payload;
                const reserved = this._handleCspLoginAck(loginAck);

                // Verify that the reserved bytes are all zero
                if (!byteEquals(reserved, this._reserved)) {
                    throw new ProtocolError('csp', 'Invalid reserved bytes in login-ack');
                }

                // Update state
                csp.state.set(CspAuthState.COMPLETE);
                break;
            }

            case CspAuthState.CLIENT_HELLO:
                throw new ProtocolError(
                    'csp',
                    `Unexpected CSP state ${
                        CspAuthStateUtils.NAME_OF[csp.state.get()]
                    } when handling an inbound message of type ${message.type}`,
                );

            default:
                unreachable(state);
        }
    }

    /**
     * Handle a CSP payload frame.
     *
     * @param frame The frame to handle
     * @returns An {@link InboundL3CspMessage} for further processing, or `undefined` if no further
     *   processing is required. All data referenced inside the resulting message will be cloned.
     */
    private _handleCspPayloadFrame(
        source: InboundL2CspMessage,
        frame: structbuf.csp.payload.Frame,
    ): InboundL3CspMessage | undefined {
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Decrypt and decode a payload container
        const payload = structbuf.csp.payload.Container.decode(
            csp.box
                .unwrap()
                .decryptorWithCspNonce(
                    buffer,
                    csp.sck.unwrap(),
                    csp.ssn.next(),
                    frame.box as EncryptedData,
                )
                .decrypt(undefined).plainData,
        );

        // Decode payload according to its type
        //
        // Note: We clone the resulting payload since the buffer will be reused.
        let decodedPayload;
        try {
            decodedPayload = this._decodeCspPayload(payload.clone());
        } catch (error) {
            this._capture?.(source, {
                error: error instanceof ProtocolError ? error : undefined,
            });
            if (error instanceof ProtocolError) {
                this._log.warn(
                    `Discarding inbound CSP payload frame: ${extractErrorMessage(error, 'short')}`,
                );
                return undefined;
            }
            throw ensureError(error);
        }
        if (decodedPayload === undefined) {
            return undefined;
        }

        // Special case: _Queue send complete_
        if (decodedPayload.type === CspPayloadType.QUEUE_SEND_COMPLETE) {
            this._log.info('CSP message queue is dry');
            return undefined;
        }

        // Forward
        const payloadMessage: InboundL3CspMessage = {
            type: D2mPayloadType.PROXY,
            payload: decodedPayload,
        };
        this._capture?.(payloadMessage);
        return {
            type: D2mPayloadType.PROXY,
            payload: decodedPayload,
        };
    }

    private _handleCspServerHello(
        serverHello: structbuf.csp.handshake.ServerHello,
    ): structbuf.csp.handshake.ServerChallengeResponse {
        const {config} = this._services;
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Decrypt and decode `server-challenge-response`
        return structbuf.csp.handshake.ServerChallengeResponse.decode(
            csp.tck
                .getSharedBox(
                    config.CHAT_SERVER_KEY,
                    NONCE_UNGUARDED_SCOPE, // Safe because TCK is ephemeral
                    undefined,
                )
                .decryptorWithCspNonce(
                    buffer,
                    serverHello.sck as ServerCookie,
                    csp.ssn.next(),
                    serverHello.serverChallengeResponseBox as EncryptedData,
                )
                .decrypt(undefined).plainData,
        );
    }

    private _handleCspLoginAck(loginAck: structbuf.csp.handshake.LoginAck): PlainData {
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Decrypt reserved bytes
        return csp.box
            .unwrap()
            .decryptorWithCspNonce(
                buffer,
                csp.sck.unwrap(),
                csp.ssn.next(),
                loginAck.reservedBox as EncryptedData,
            )
            .decrypt(undefined).plainData;
    }

    private _createCspLogin(
        tsk: TemporaryServerKey,
    ): CspMessage<LayerEncoder<structbuf.csp.handshake.LoginEncodable>> {
        const {csp} = this._controller;

        // Generate sequence numbers for `vouch-box` and the `extension`s.
        // Note: We need to do this beforehand since we will encode
        //       the extensions first even though it will get the latter
        //       sequence number.
        const csnOne = csp.csn.next();
        const csnTwo = csp.csn.next();

        // Encode and encrypt a contiguous byte array of `extension`
        const extensionsBox = this._createCspExtensions(csnTwo);

        // Encode and encrypt `login-data`
        const loginDataBox = this._createCspLoginData(tsk, extensionsBox.byteLength, csnOne);

        // Return encoder
        return {
            type: D2mPayloadType.PROXY,
            payload: structbuf.bridge.encoder(structbuf.csp.handshake.Login, {
                box: loginDataBox,
                extensionsBox,
            }),
        };
    }

    private _createCspExtensions(csn: ClientSequenceNumberValue): EncryptedData {
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Encode and encrypt a contiguous byte array of `extension`s
        return csp.box
            .unwrap()
            .encryptor(buffer, (array) =>
                // Encode extensions packed after one another
                byteEncodeSequence(
                    array,

                    // Encode `client-info` extension
                    structbuf.bridge.byteEncoder(structbuf.csp.handshake.Extension, {
                        type: CspExtensionType.CLIENT_INFO,
                        payload: structbuf.bridge.byteEncoder(structbuf.csp.handshake.ClientInfo, {
                            clientInfo: {
                                encode: (cia): Uint8Array =>
                                    UTF8.encodeFullyInto(csp.info, cia).encoded,
                            },
                        }),
                    }).encode,

                    // Encode `csp-device-id` extension
                    structbuf.bridge.byteEncoder(structbuf.csp.handshake.Extension, {
                        type: CspExtensionType.CSP_DEVICE_ID,
                        payload: structbuf.bridge.byteEncoder(structbuf.csp.handshake.CspDeviceId, {
                            cspDeviceId: csp.deviceId,
                        }),
                    }).encode,

                    // Encode `message-payload-version` extension to request
                    // `message-with-metadata-box` for incoming/outgoing messages.
                    structbuf.bridge.byteEncoder(structbuf.csp.handshake.Extension, {
                        type: CspExtensionType.MESSAGE_PAYLOAD_VERSION,
                        payload: structbuf.bridge.byteEncoder(
                            structbuf.csp.handshake.MessagePayloadVersion,
                            {
                                version: CspMessagePayloadVersion.MESSAGE_WITH_METADATA_BOX,
                            },
                        ),
                    }).encode,
                ),
            )
            .encryptWithCspNonce(csp.cck, csn);
    }

    private _createCspLoginData(
        tsk: TemporaryServerKey,
        extensionsBoxLength: u53,
        csn: ClientSequenceNumberValue,
    ): EncryptedData {
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Encode and encrypt `login-data`
        return csp.box
            .unwrap()
            .encryptor(
                buffer,
                structbuf.bridge.byteEncoder(structbuf.csp.handshake.LoginData, {
                    identity: csp.identity,
                    clientInfoOrExtensionIndicator: structbuf.bridge.byteEncoder(
                        structbuf.csp.handshake.ExtensionIndicator,
                        {
                            magic: CLEVER_EXTENSION_MAGIC,
                            length: extensionsBoxLength,
                        },
                    ),
                    sck: csp.sck.unwrap(),
                    reserved1: VOUCH_RESERVED1_BYTES,
                    // TODO(DESK-812): Remove cast
                    vouch: this._calculateCspVouchMac(tsk) as Uint8Array,
                    reserved2: VOUCH_RESERVED2_BYTES,
                }).encode,
            )
            .encryptWithCspNonce(csp.cck, csn);
    }

    private _calculateCspVouchMac(tsk: TemporaryServerKey): ReadonlyUint8Array {
        const {config} = this._services;
        const {csp} = this._controller;
        const vouchKey = deriveVouchKey(config, csp.ck, tsk);
        const vouchMac = hash(32, vouchKey.asReadonly(), undefined)
            .update(csp.sck.unwrap())
            .update(csp.tck.public)
            .digest();
        vouchKey.purge();
        return vouchMac;
    }

    /**
     * Decode the CSP payload type.
     *
     * @throws {ProtocolError} if an unexpected or unknown message type is received.
     */
    private _decodeCspPayload({
        type,
        data,
    }: structbuf.csp.payload.Container):
        | InboundL3CspMessage['payload']
        | InternalInboundL3CspMessage['payload']
        | undefined {
        const maybePayloadType = type as CspPayloadType;
        switch (maybePayloadType) {
            case CspPayloadType.ECHO_REQUEST:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.EchoRequest.decode(data),
                };
            case CspPayloadType.ECHO_RESPONSE:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.EchoResponse.decode(data),
                };
            case CspPayloadType.OUTGOING_MESSAGE_ACK:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.MessageAck.decode(data),
                };
            case CspPayloadType.INCOMING_MESSAGE:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.MessageWithMetadataBox.decode(data),
                };
            case CspPayloadType.QUEUE_SEND_COMPLETE:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.QueueSendComplete.decode(data),
                };
            case CspPayloadType.LAST_EPHEMERAL_KEY_HASH:
                // TODO(SE-252): Investigate whether we can verify the last ephemeral key hash
                this._log.debug('Discarding inbound CSP last ephemeral key hash');
                return undefined;
            case CspPayloadType.CLOSE_ERROR:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.CloseError.decode(data),
                };
            case CspPayloadType.ALERT:
                return {
                    type: maybePayloadType,
                    payload: structbuf.csp.payload.Alert.decode(data),
                };
            case CspPayloadType.OUTGOING_MESSAGE:
            case CspPayloadType.UNBLOCK_INCOMING_MESSAGES:
            case CspPayloadType.INCOMING_MESSAGE_ACK:
            case CspPayloadType.SET_CONNECTION_IDLE_TIMEOUT:
                // Note: These are all considered unreachable but need to be handled so we don't miss any
                //       payload types in the below `unreachable`.
                throw new ProtocolError(
                    'csp',
                    `Unexpected inbound CSP payload type 0x${byteToHex(type)}`,
                );
            default:
                return unreachable(
                    maybePayloadType,
                    new ProtocolError(
                        'csp',
                        `Unknown inbound CSP payload type 0x${byteToHex(type)}`,
                    ),
                );
        }
    }

    private _handleD2mMessage(
        message: InboundL2D2mMessage,
        forward: (message: InboundL3Message) => void,
    ): void {
        const {d2m, connection} = this._controller;
        const {model} = this._services;
        const state = d2m.state.get();
        switch (state) {
            case D2mAuthState.COMPLETE: {
                // Ensure the first D2M message is the server info
                if (!d2m.serverInfo.done) {
                    if (message.type !== D2mPayloadType.SERVER_INFO) {
                        throw new ProtocolError(
                            'd2m',
                            `Expected inbound 'ServerInfo' D2M message, got: ${message.payload.constructor.name}`,
                        );
                    }
                    d2m.serverInfo.resolve(
                        protobuf.validate.d2m.ServerInfo.SCHEMA.parse(message.payload),
                    );

                    model.globalProperties.createOrUpdate(
                        GlobalPropertyKey.LAST_MEDIATOR_CONNECTION,
                        {date: new Date()},
                    );

                    break;
                }

                switch (message.type) {
                    // Ensure handshake messages are not repeated
                    case D2mPayloadType.SERVER_HELLO:
                    case D2mPayloadType.SERVER_INFO:
                        throw new ProtocolError(
                            'd2m',
                            `Unexpected inbound '${message.type}' D2M message after auth state was already complete`,
                        );
                    case D2mPayloadType.ROLE_PROMOTED_TO_LEADER:
                        this._log.info('Promoted to leader');
                        d2m.promotedToLeader.resolve();
                        break;
                    case D2mPayloadType.REFLECTION_QUEUE_DRY:
                        this._log.info('Reflection queue is dry');
                        d2m.reflectionQueueDry.resolve();
                        break;
                    default:
                        // Forward
                        forward(message);
                        break;
                }

                break;
            }

            case D2mAuthState.SERVER_HELLO: {
                if (!(message.payload instanceof protobuf.d2m.ServerHello)) {
                    throw new ProtocolError(
                        'd2m',
                        `Expected inbound 'ServerHello' D2M message, got: ${message.payload.constructor.name}`,
                    );
                }

                // Validate
                const serverHello = protobuf.validate.d2m.ServerHello.SCHEMA.parse(message.payload);

                // Select protocol version
                if (serverHello.version < D2M_PROTOCOL_VERSION.MIN) {
                    connection.unwrap().disconnect({
                        code: CloseCode.UNSUPPORTED_PROTOCOL_VERSION,
                        clientInitiated: true,
                    });
                    throw new ProtocolError(
                        'd2m',
                        `Unsupported d2m protocol version (${serverHello.version})`,
                    );
                }
                const selectedProtocolVersion = Math.min(
                    D2M_PROTOCOL_VERSION.MAX,
                    serverHello.version,
                );
                d2m.protocolVersion.resolve(selectedProtocolVersion);
                this._log.info(`Selected D2M protocol version ${selectedProtocolVersion}`);

                // Encode and enqueue `ClientHello`
                const clientHelloMessage = this._createD2mClientHello(
                    serverHello,
                    selectedProtocolVersion,
                );
                this._encoder.unwrap().forward(clientHelloMessage);

                // Update state
                d2m.state.set(D2mAuthState.COMPLETE);
                break;
            }

            default:
                unreachable(
                    state,
                    new ProtocolError(
                        'd2m',
                        `Unexpected D2M state ${d2m.state.get()} when handling an inbound message of type ${
                            message.type
                        }`,
                    ),
                );
        }
    }

    private _createD2mClientHello(
        serverHello: protobuf.validate.d2m.ServerHello.Type,
        chosenVersion: u32,
    ): D2mMessage<D2mPayloadType.CLIENT_HELLO, LayerEncoder<protobuf.d2m.ClientHelloEncodable>> {
        const {d2m} = this._controller;
        const buffer = this._buffer;

        // Encrypt the challenge response
        const challengeResponse = d2m.dgpk
            .getSharedBox(serverHello.esk as ReadonlyUint8Array as PublicKey)
            .encryptor(buffer, serverHello.challenge as PlainData)
            .encryptWithRandomNonceAhead('Layer3Decoder#_createD2mClientHello');

        // Encode and encrypt `d2d.DeviceInfo`
        const encryptedDeviceInfo = this._createD2mEncryptedDeviceInfo();

        // Determine device slot exhausted and expiration policy
        const deviceSlotsExhaustedPolicy =
            protobuf.d2m.ClientHello.DeviceSlotsExhaustedPolicy.REJECT;
        const deviceSlotExpirationPolicy = d2m.deviceSlotExpirationPolicy;

        // Determine the expected device slot state
        const lastConnection = this._services.model.globalProperties.getOrCreate(
            GlobalPropertyKey.LAST_MEDIATOR_CONNECTION,
            {
                date: undefined,
            },
        );
        const expectedDeviceSlotState =
            protobuf.d2m.DeviceSlotState[
                lastConnection.get().view.value.date === undefined ? 'NEW' : 'EXISTING'
            ];
        this._log.debug(
            `Expected device slot state is ${
                expectedDeviceSlotState === protobuf.d2m.DeviceSlotState.NEW ? 'NEW' : 'EXISTING'
            }`,
        );

        // Return encoder
        return {
            type: D2mPayloadType.CLIENT_HELLO,
            payload: protobuf.utils.encoder(protobuf.d2m.ClientHello, {
                version: chosenVersion,
                response: challengeResponse,
                deviceId: intoUnsignedLong(d2m.deviceId),
                deviceSlotsExhaustedPolicy,
                deviceSlotExpirationPolicy,
                expectedDeviceSlotState,
                encryptedDeviceInfo,
            }),
        };
    }

    private _createD2mEncryptedDeviceInfo(): EncryptedDeviceInfo {
        const {crypto} = this._services;
        const {d2m} = this._controller;
        const buffer = this._buffer;

        // Encode and encrypt `d2d.DeviceInfo`
        return d2m.dgdik
            .encryptor(
                buffer,
                protobuf.utils.byteEncoder(protobuf.d2d.DeviceInfo, {
                    // TODO(DESK-322): What padding constraints do we want to apply?
                    padding: bytePadPkcs7(buffer, randomPkcs7PaddingLength(crypto)),
                    platform: protobuf.d2d.DeviceInfo.Platform.DESKTOP,
                    platformDetails: d2m.platformDetails,
                    appVersion: import.meta.env.BUILD_VERSION,
                    label: d2m.label,
                }).encode,
            )
            .encryptWithRandomNonceAhead(
                'Layer3Decoder#_createD2mEncryptedDeviceInfo',
            ) as EncryptedDeviceInfo;
    }
}

type InternalOutboundL3CspMessage = CspMessage<
    CspPayload<
        CspPayloadType.UNBLOCK_INCOMING_MESSAGES,
        LayerEncoder<structbuf.csp.payload.UnblockIncomingMessagesEncodable>
    >
>;

export class Layer3Encoder implements SyncTransformerCodec<OutboundL3Message, OutboundL2Message> {
    private readonly _log: Logger;
    private readonly _buffer: ByteBuffer;

    public constructor(
        services: ServicesForBackend,
        private readonly _controller: Layer3Controller,
        private readonly _encoder: Delayed<{
            readonly forward: (message: OutboundL2Message) => void;
        }>,
        private readonly _capture?: RawCaptureHandler,
    ) {
        this._log = services.logging.logger('network.protocol.l3.encoder');
        this._buffer = new ByteBuffer(
            new Uint8Array(services.config.MEDIATOR_FRAME_MAX_BYTE_LENGTH),
        );
    }

    public start(forward: (message: OutboundL2Message) => void): void {
        const {csp, d2m} = this._controller;

        // Set encoder for forwarding messages from the decoder
        this._encoder.set({forward});

        // Expect that we need to send the CSP `client-hello` when starting up
        if (csp.state.get() !== CspAuthState.CLIENT_HELLO) {
            throw new ProtocolError(
                'csp',
                `Unexpected CSP state ${
                    CspAuthStateUtils.NAME_OF[csp.state.get()]
                } when starting Layer3Encoder`,
            );
        }

        // Encode and enqueue `client-hello`
        const clientHelloMessage = this._createCspClientHello();
        this._capture?.(clientHelloMessage, {info: 'ClientHello'});
        forward(clientHelloMessage);

        // Update state
        csp.state.set(CspAuthState.SERVER_HELLO);

        // Wait until authenticated **and** role promoted to leader to unblock the CSP message queue
        void Promise.all([csp.authenticated, d2m.promotedToLeader]).then(() => {
            // Ensure that ReflectionQueueDry message was received
            //
            // Note: The assertion should never trigger if incoming messages are processed sequentially.
            //       It might indicate either a bug in the message processing, or in the mediator
            //       server.
            assert(
                d2m.reflectionQueueDry.done,
                'RolePromotedToLeader was received before ReflectionQueueDry',
            );

            // Unblock incoming messages from the chat server
            void csp.authenticated.then(() => {
                this._handleCspMessage(
                    {
                        type: D2mPayloadType.PROXY,
                        payload: {
                            type: CspPayloadType.UNBLOCK_INCOMING_MESSAGES,
                            payload: structbuf.bridge.encoder(
                                structbuf.csp.payload.UnblockIncomingMessages,
                                {},
                            ),
                        },
                    },
                    forward,
                );
                this._log.debug('Unblocking CSP message queue');
            });
        });
    }

    public transform(
        message: OutboundL3Message,
        forward: (message: OutboundL2Message) => void,
    ): void {
        try {
            // Reject upper layer messages until authenticated
            this._validateState(message);

            // Reset the buffer with each outgoing message
            this._buffer.reset();

            // Handle CSP or D2M message
            if (message.type === D2mPayloadType.PROXY) {
                this._handleCspMessage(message, forward);
            } else {
                this._handleD2mMessage(message, forward);
            }
        } catch (error) {
            this._capture?.(message, {
                error: error instanceof ProtocolError ? error : undefined,
            });
            throw ensureError(error);
        }
    }

    private _validateState(message: OutboundL3Message): void {
        const {csp, d2m} = this._controller;
        if (message.type === D2mPayloadType.PROXY && csp.state.get() !== CspAuthState.COMPLETE) {
            throw new ProtocolError(
                'csp',
                `Invalid CSP state ${
                    CspAuthStateUtils.NAME_OF[csp.state.get()]
                } when handling an upper layer ` +
                    `message of type ${D2mPayloadTypeUtils.NAME_OF[message.type]}`,
            );
        } else if (d2m.state.get() !== D2mAuthState.COMPLETE) {
            throw new ProtocolError(
                'd2m',
                `Invalid D2M state ${
                    D2mAuthStateUtils.NAME_OF[d2m.state.get()]
                } when handling an upper layer ` +
                    `message of type ${D2mPayloadTypeUtils.NAME_OF[message.type]}`,
            );
        }
    }

    private _createCspClientHello(): CspMessage<
        LayerEncoder<structbuf.csp.handshake.ClientHelloEncodable>
    > {
        const {csp} = this._controller;

        // Return encoder
        return {
            type: D2mPayloadType.PROXY,
            payload: structbuf.bridge.encoder(structbuf.csp.handshake.ClientHello, {
                // TODO(DESK-812): Remove cast
                tck: csp.tck.public as ReadonlyUint8Array as Uint8Array,
                cck: csp.cck,
            }),
        };
    }

    private _handleCspMessage(
        message: OutboundL3CspMessage | InternalOutboundL3CspMessage,
        forward: (message: OutboundL2Message) => void,
    ): void {
        // Encode payload into a payload frame
        const frame = this._createCspPayloadFrame(message.payload);
        this._capture?.(frame, {info: 'Payload'});
        forward(frame);
    }

    private _createCspPayloadFrame({
        type,
        payload,
    }: OutboundL3CspMessage['payload'] | InternalOutboundL3CspMessage['payload']): CspMessage<
        LayerEncoder<structbuf.csp.payload.FrameEncodable>
    > {
        const {csp} = this._controller;
        const buffer = this._buffer;

        // Wrap in a payload container
        const container = structbuf.bridge.encoder(structbuf.csp.payload.Container, {
            type,
            reserved: PAYLOAD_RESERVED_BYTES,
            data: payload,
        });

        // Encrypt and encode into a payload frame
        return {
            type: D2mPayloadType.PROXY,
            payload: structbuf.bridge.encoder(structbuf.csp.payload.Frame, {
                box: csp.box
                    .unwrap()
                    .encryptor(buffer, container.encode)
                    .encryptWithCspNonce(csp.cck, csp.csn.next()),
            }),
        };
    }

    private _handleD2mMessage(
        message: OutboundL3D2mMessage,
        forward: (message: OutboundL2Message) => void,
    ): void {
        // Passthrough
        forward(message);
    }
}
