import {common, group_call} from '@threema/protocol/protobuf';
import type {u64} from '@threema/ts-utils/integer/u64';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {intoUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {describe, expect, it} from 'vitest';

import {creator, creatorForMap, type ProtobufInstanceOf} from './protobuf.js';
import {
    CALL_STATE_SNAPSHOT_SCHEMA,
    JOIN_RESPONSE_SCHEMA,
    P2P_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA,
    P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA,
    PEEK_RESPONSE_SCHEMA,
    S2P_ENVELOPE_SCHEMA,
    type S2pHello,
} from './schema.js';

/** Bytes with a recognisable, non-zero pattern. */
function bytes(length: number, seed = 1): Uint8Array {
    return Uint8Array.from({length}, (_, index) => ((index + seed) % 255) + 1);
}

/**
 * Compare byte arrays by content.
 *
 * Note: protobufjs hands out `Buffer` instances for `bytes` fields on Node, so the arrays must be
 * normalised before they can be compared.
 */
function expectBytes(actual: ArrayLike<number>, expected: Uint8Array): void {
    expect(Uint8Array.from(actual)).toStrictEqual(expected);
}

const NO_PADDING = new Uint8Array(0);
const UNIT = creator(common.Unit, {});

/** A public key, a cookie and a PCMK in the lengths their `ensure` functions demand. */
const PCK = bytes(32, 1);
const PCCK = bytes(16, 2);
const PCMK = bytes(32, 3);

describe('CALL_STATE_SNAPSHOT_SCHEMA', () => {
    function encode(
        participants: readonly [
            participantId: string,
            participant: ProtobufInstanceOf<typeof group_call.CallState.Participant>,
        ][],
    ): group_call.CallState {
        return group_call.CallState.decode(
            group_call.CallState.encode(
                creator(group_call.CallState, {
                    padding: NO_PADDING,
                    stateCreatedBy: 1,
                    stateCreatedAt: intoUnsignedLong(1337n as u64),
                    participants: creatorForMap(group_call.CallState.Participant, participants),
                }),
            ).finish(),
        );
    }

    function normal(
        identity: string,
        nickname: string,
    ): ProtobufInstanceOf<typeof group_call.CallState.Participant> {
        return creator(group_call.CallState.Participant, {
            threema: creator(group_call.CallState.Participant.Normal, {identity, nickname}),
            guest: undefined,
        });
    }

    it('decodes a call state with normal participants', () => {
        // Act
        const snapshot = CALL_STATE_SNAPSHOT_SCHEMA.parse(
            encode([
                ['1', normal('ECHOECHO', 'Echo')],
                ['2', normal('MEMEMEME', 'Me')],
            ]),
        );

        // Assert
        expect(snapshot.stateCreatedBy).toBe(1);
        expect(snapshot.stateCreatedAt).toStrictEqual(new Date(1337));
        expect(Object.entries(snapshot.participants)).toStrictEqual([
            ['1', {identity: 'ECHOECHO', nickname: 'Echo'}],
            ['2', {identity: 'MEMEMEME', nickname: 'Me'}],
        ]);
    });

    it('maps an absent nickname to undefined', () => {
        // Act
        const snapshot = CALL_STATE_SNAPSHOT_SCHEMA.parse(encode([['1', normal('ECHOECHO', '')]]));

        // Assert
        expect(Object.entries(snapshot.participants)).toStrictEqual([
            ['1', {identity: 'ECHOECHO', nickname: undefined}],
        ]);
    });

    it('rejects a guest participant', () => {
        // Act & assert
        expect(() =>
            CALL_STATE_SNAPSHOT_SCHEMA.parse(
                encode([
                    [
                        '1',
                        creator(group_call.CallState.Participant, {
                            threema: undefined,
                            guest: creator(group_call.CallState.Participant.Guest, {
                                name: 'Guest',
                            }),
                        }),
                    ],
                ]),
            ),
        ).toThrow('Guest participants are not allowed in a group call');
    });

    it('rejects a participant that is neither normal nor a guest', () => {
        // Act & assert
        expect(() =>
            CALL_STATE_SNAPSHOT_SCHEMA.parse(
                encode([
                    [
                        '1',
                        creator(group_call.CallState.Participant, {
                            threema: undefined,
                            guest: undefined,
                        }),
                    ],
                ]),
            ),
        ).toThrow('Assertion failed');
    });

    it('rejects an invalid Threema ID', () => {
        // Act & assert
        expect(() =>
            CALL_STATE_SNAPSHOT_SCHEMA.parse(encode([['1', normal('nope', 'Nope')]])),
        ).toThrow('Not a valid Threema ID: nope');
    });
});

describe('PEEK_RESPONSE_SCHEMA', () => {
    function encode(encryptedCallState: Uint8Array | undefined): group_call.SfuHttpResponse.Peek {
        return group_call.SfuHttpResponse.Peek.decode(
            group_call.SfuHttpResponse.Peek.encode(
                creator(group_call.SfuHttpResponse.Peek, {
                    startedAt: intoUnsignedLong(42n as u64),
                    maxParticipants: 16,
                    encryptedCallState,
                }),
            ).finish(),
        );
    }

    it('decodes a peek response with an encrypted call state', () => {
        // Arrange: The nonce-ahead guard demands at least a nonce plus a MAC.
        const encryptedCallState = bytes(24 + 16);

        // Act
        const response = PEEK_RESPONSE_SCHEMA.parse(encode(encryptedCallState));

        // Assert
        expect(response.startedAt).toStrictEqual(new Date(42));
        expect(response.maxParticipants).toBe(16);
        expectBytes(unwrap(response.encryptedCallState), encryptedCallState);
    });

    it('decodes a peek response without an encrypted call state', () => {
        // Act
        const response = PEEK_RESPONSE_SCHEMA.parse(encode(undefined));

        // Assert
        expect(response.encryptedCallState).toBeUndefined();
    });

    it('rejects an encrypted call state that is too short to be one', () => {
        // Act & assert
        expect(() => PEEK_RESPONSE_SCHEMA.parse(encode(bytes(39)))).toThrow(
            'Expected encrypted data to be at least 40 bytes but has 39 bytes',
        );
    });
});

describe('JOIN_RESPONSE_SCHEMA', () => {
    const ADDRESS = creator(group_call.SfuHttpResponse.Join.Address, {
        protocol: group_call.SfuHttpResponse.Join.Address.Protocol.UDP,
        port: 12345,
        ip: '192.0.2.1',
    });

    function encode({
        addresses = [ADDRESS],
        rtpHeaderExtensionIds,
        supportedFeatures,
    }: {
        readonly addresses?: readonly ProtobufInstanceOf<
            typeof group_call.SfuHttpResponse.Join.Address
        >[];
        readonly rtpHeaderExtensionIds?: ProtobufInstanceOf<
            typeof group_call.SfuHttpResponse.Join.RtpHeaderExtensionIds
        >;
        readonly supportedFeatures?: u64;
    }): group_call.SfuHttpResponse.Join {
        return group_call.SfuHttpResponse.Join.decode(
            group_call.SfuHttpResponse.Join.encode(
                creator(group_call.SfuHttpResponse.Join, {
                    startedAt: intoUnsignedLong(42n as u64),
                    maxParticipants: 16,
                    participantId: 3,
                    addresses,
                    iceUsernameFragment: 'ufrag',
                    icePassword: 'a'.repeat(22),
                    dtlsFingerprint: bytes(32),
                    rtpHeaderExtensionIds,
                    supportedFeatures:
                        supportedFeatures === undefined
                            ? undefined
                            : intoUnsignedLong(supportedFeatures),
                }),
            ).finish(),
        );
    }

    it('decodes a join response', () => {
        // Act
        const response = JOIN_RESPONSE_SCHEMA.parse(encode({}));

        // Assert
        expect(response.startedAt).toStrictEqual(new Date(42));
        expect(response.maxParticipants).toBe(16);
        expect(response.participantId).toBe(3);
        expect(response.addresses).toStrictEqual([
            {
                protocol: group_call.SfuHttpResponse.Join.Address.Protocol.UDP,
                port: 12345,
                ip: '192.0.2.1',
            },
        ]);
        expect(response.iceUsernameFragment).toBe('ufrag');
        expect(response.icePassword).toBe('a'.repeat(22));
        expectBytes(response.dtlsFingerprint, bytes(32));
    });

    it('falls back to the well-known RTP header extension IDs when absent', () => {
        // Act
        const response = JOIN_RESPONSE_SCHEMA.parse(encode({}));

        // Assert
        expect(response.rtpHeaderExtensionIds).toStrictEqual({
            mid: 1,
            rtpStreamId: 2,
            repairedRtpStreamId: 3,
            absoluteSendTime: 4,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            transportWideCongestionControl_01: 5,
            videoOrientation: 11,
            timeOffset: 12,
        });
    });

    it('decodes the announced RTP header extension IDs', () => {
        // Act
        const response = JOIN_RESPONSE_SCHEMA.parse(
            encode({
                rtpHeaderExtensionIds: creator(
                    group_call.SfuHttpResponse.Join.RtpHeaderExtensionIds,
                    {
                        mid: 2,
                        rtpStreamId: 3,
                        repairedRtpStreamId: 4,
                        absoluteSendTime: 5,
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        transportWideCongestionControl_01: 6,
                        videoOrientation: 12,
                        timeOffset: 13,
                    },
                ),
            }),
        );

        // Assert
        expect(response.rtpHeaderExtensionIds.mid).toBe(2);
        expect(response.rtpHeaderExtensionIds.timeOffset).toBe(13);
    });

    it('falls back to the base feature set when no features are announced', () => {
        // Act
        const response = JOIN_RESPONSE_SCHEMA.parse(encode({}));

        // Assert
        expect(response.supportedFeatures.base).toBe(true);
        expect(response.supportedFeatures.screenShare).toBe(false);
    });

    it('decodes the announced feature set', () => {
        // Act
        const response = JOIN_RESPONSE_SCHEMA.parse(
            encode({supportedFeatures: BigInt(group_call.SupportedFeature.SCREEN_SHARE)}),
        );

        // Assert
        expect(response.supportedFeatures.screenShare).toBe(true);
    });

    it('rejects an address that does not use UDP', () => {
        // Act & assert
        expect(() =>
            JOIN_RESPONSE_SCHEMA.parse(
                encode({
                    addresses: [
                        creator(group_call.SfuHttpResponse.Join.Address, {
                            protocol: 1 as group_call.SfuHttpResponse.Join.Address.Protocol,
                            port: 12345,
                            ip: '192.0.2.1',
                        }),
                    ],
                }),
            ),
        ).toThrow();
    });

    it('rejects an ICE password that is too short', () => {
        // Arrange
        const response = encode({});
        response.icePassword = 'too-short';

        // Act & assert
        expect(() => JOIN_RESPONSE_SCHEMA.parse(response)).toThrow(
            "Not a valid ICE password: 'too-short'",
        );
    });
});

describe('S2P_ENVELOPE_SCHEMA', () => {
    function encode(content: {
        readonly hello?: ProtobufInstanceOf<typeof group_call.SfuToParticipant.Hello>;
        readonly relay?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.OuterEnvelope
        >;
        readonly participantJoined?: ProtobufInstanceOf<
            typeof group_call.SfuToParticipant.ParticipantJoined
        >;
        readonly participantLeft?: ProtobufInstanceOf<
            typeof group_call.SfuToParticipant.ParticipantLeft
        >;
        readonly timestampResponse?: ProtobufInstanceOf<
            typeof group_call.SfuToParticipant.Timestamp
        >;
    }): group_call.SfuToParticipant.Envelope {
        return group_call.SfuToParticipant.Envelope.decode(
            group_call.SfuToParticipant.Envelope.encode(
                creator(group_call.SfuToParticipant.Envelope, {
                    padding: NO_PADDING,
                    hello: content.hello,
                    relay: content.relay,
                    participantJoined: content.participantJoined,
                    participantLeft: content.participantLeft,
                    timestampResponse: content.timestampResponse,
                }),
            ).finish(),
        );
    }

    function parseHello(participantIds: readonly number[]): S2pHello {
        const envelope = S2P_ENVELOPE_SCHEMA.parse(
            encode({
                hello: creator(group_call.SfuToParticipant.Hello, {participantIds}),
            }),
        );
        expect(envelope.content).toBe('hello');
        return unwrap(envelope.hello);
    }

    // Regression test: When creating a group call, the SFU's 'hello' contains no other
    // participants, so the (packed, repeated) field is absent on the wire. Parsing must not
    // fail in that case.
    it("accepts an SFU 'hello' without any participants", () => {
        // Act
        const hello = parseHello([]);

        // Assert
        expect(hello.participantIds).toStrictEqual([]);
    });

    it("accepts an SFU 'hello' with existing participants", () => {
        // Act
        const hello = parseHello([1, 2, 42]);

        // Assert
        expect(hello.participantIds).toStrictEqual([1, 2, 42]);
    });

    it("decodes a 'relay'", () => {
        // Arrange
        const encryptedData = bytes(8);

        // Act
        const envelope = S2P_ENVELOPE_SCHEMA.parse(
            encode({
                relay: creator(group_call.ParticipantToParticipant.OuterEnvelope, {
                    sender: 1,
                    receiver: 2,
                    encryptedData,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('relay');
        const relay = unwrap(envelope.relay);
        expect(relay.sender).toBe(1);
        expect(relay.receiver).toBe(2);
        expectBytes(relay.encryptedData, encryptedData);
    });

    it("decodes a 'participantJoined'", () => {
        // Act
        const envelope = S2P_ENVELOPE_SCHEMA.parse(
            encode({
                participantJoined: creator(group_call.SfuToParticipant.ParticipantJoined, {
                    participantId: 7,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('participantJoined');
        expect(unwrap(envelope.participantJoined).participantId).toBe(7);
    });

    it("decodes a 'participantLeft'", () => {
        // Act
        const envelope = S2P_ENVELOPE_SCHEMA.parse(
            encode({
                participantLeft: creator(group_call.SfuToParticipant.ParticipantLeft, {
                    participantId: 7,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('participantLeft');
        expect(unwrap(envelope.participantLeft).participantId).toBe(7);
    });

    it("decodes a 'timestampResponse'", () => {
        // Act
        const envelope = S2P_ENVELOPE_SCHEMA.parse(
            encode({
                timestampResponse: creator(group_call.SfuToParticipant.Timestamp, {
                    ms: intoUnsignedLong(1337n as u64),
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('timestampResponse');
        expect(unwrap(envelope.timestampResponse).ms).toBe(1337n);
    });

    it('accepts an envelope whose content is a variant it does not know', () => {
        // Act
        const envelope = S2P_ENVELOPE_SCHEMA.parse(encode({}));

        // Assert
        expect(envelope.content).toBeUndefined();
    });

    it('rejects a participant id beyond the MID partitions', () => {
        // Act & assert
        expect(() => parseHello([790])).toThrow("Not a valid participant id: '790'");
    });
});

describe('P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA', () => {
    function encode(content: {
        readonly hello?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.Handshake.Hello
        >;
        readonly guestHello?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.Handshake.GuestHello
        >;
    }): group_call.ParticipantToParticipant.Handshake.HelloEnvelope {
        const helloEnvelope = group_call.ParticipantToParticipant.Handshake.HelloEnvelope;
        return helloEnvelope.decode(
            helloEnvelope
                .encode(
                    creator(helloEnvelope, {
                        padding: NO_PADDING,
                        hello: content.hello,
                        guestHello: content.guestHello,
                    }),
                )
                .finish(),
        );
    }

    it("decodes a normal 'hello'", () => {
        // Act
        const envelope = P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA.parse(
            encode({
                hello: creator(group_call.ParticipantToParticipant.Handshake.Hello, {
                    identity: 'ECHOECHO',
                    nickname: 'Echo',
                    pck: PCK,
                    pcck: PCCK,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('hello');
        const hello = unwrap(envelope.hello);
        expect(hello.identity).toBe('ECHOECHO');
        expect(hello.nickname).toBe('Echo');
        expectBytes(hello.pck, PCK);
        expectBytes(hello.pcck, PCCK);
    });

    it("decodes a 'guestHello' without interpreting it", () => {
        // Act
        const envelope = P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA.parse(
            encode({
                guestHello: creator(group_call.ParticipantToParticipant.Handshake.GuestHello, {
                    name: 'Guest',
                    pck: PCK,
                    pcck: PCCK,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('guestHello');
    });

    it('rejects an envelope without any content', () => {
        // Act & assert
        expect(() => P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA.parse(encode({}))).toThrow();
    });

    it('rejects a participant call key of the wrong length', () => {
        // Act & assert
        expect(() =>
            P2P_HANDSHAKE_HELLO_ENVELOPE_SCHEMA.parse(
                encode({
                    hello: creator(group_call.ParticipantToParticipant.Handshake.Hello, {
                        identity: 'ECHOECHO',
                        nickname: 'Echo',
                        pck: bytes(31),
                        pcck: PCCK,
                    }),
                }),
            ),
        ).toThrow();
    });
});

describe('P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA', () => {
    function encode(content: {
        readonly auth?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.Handshake.Auth
        >;
        readonly guestAuth?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.Handshake.GuestAuth
        >;
    }): group_call.ParticipantToParticipant.Handshake.AuthEnvelope {
        const authEnvelope = group_call.ParticipantToParticipant.Handshake.AuthEnvelope;
        return authEnvelope.decode(
            authEnvelope
                .encode(
                    creator(authEnvelope, {
                        padding: NO_PADDING,
                        auth: content.auth,
                        guestAuth: content.guestAuth,
                    }),
                )
                .finish(),
        );
    }

    it("decodes a normal 'auth' with its media keys", () => {
        // Act
        const envelope = P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA.parse(
            encode({
                auth: creator(group_call.ParticipantToParticipant.Handshake.Auth, {
                    pck: PCK,
                    pcck: PCCK,
                    mediaKeys: [
                        creator(group_call.ParticipantToParticipant.MediaKey, {
                            epoch: 1,
                            ratchetCounter: 2,
                            pcmk: PCMK,
                        }),
                    ],
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('auth');
        const auth = unwrap(envelope.auth);
        expectBytes(auth.pck, PCK);
        expectBytes(auth.pcck, PCCK);
        expect(auth.mediaKeys).toHaveLength(1);
        const mediaKey = unwrap(auth.mediaKeys[0]);
        expect(mediaKey.epoch).toBe(1);
        expect(mediaKey.ratchetCounter).toBe(2);
        expectBytes(mediaKey.pcmk.unwrap(), PCMK);
    });

    it("decodes a 'guestAuth' without interpreting it", () => {
        // Act
        const envelope = P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA.parse(
            encode({
                guestAuth: creator(group_call.ParticipantToParticipant.Handshake.GuestAuth, {
                    pck: PCK,
                    pcck: PCCK,
                    mediaKeys: [],
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('guestAuth');
    });

    it('rejects an envelope without any content', () => {
        // Act & assert
        expect(() => P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA.parse(encode({}))).toThrow();
    });

    it('rejects a media key of the wrong length', () => {
        // Act & assert
        expect(() =>
            P2P_HANDSHAKE_AUTH_ENVELOPE_SCHEMA.parse(
                encode({
                    auth: creator(group_call.ParticipantToParticipant.Handshake.Auth, {
                        pck: PCK,
                        pcck: PCCK,
                        mediaKeys: [
                            creator(group_call.ParticipantToParticipant.MediaKey, {
                                epoch: 1,
                                ratchetCounter: 2,
                                pcmk: bytes(31),
                            }),
                        ],
                    }),
                }),
            ),
        ).toThrow();
    });
});

describe('P2P_ENVELOPE_SCHEMA', () => {
    function encode(content: {
        readonly encryptedAdminEnvelope?: Uint8Array;
        readonly rekey?: ProtobufInstanceOf<typeof group_call.ParticipantToParticipant.MediaKey>;
        readonly captureState?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.CaptureState
        >;
        readonly holdState?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.HoldState
        >;
    }): group_call.ParticipantToParticipant.Envelope {
        const envelope = group_call.ParticipantToParticipant.Envelope;
        return envelope.decode(
            envelope
                .encode(
                    creator(envelope, {
                        padding: NO_PADDING,
                        encryptedAdminEnvelope: content.encryptedAdminEnvelope,
                        rekey: content.rekey,
                        captureState: content.captureState,
                        holdState: content.holdState,
                    }),
                )
                .finish(),
        );
    }

    function captureState(state: {
        readonly microphone?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.CaptureState.Microphone
        >;
        readonly camera?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.CaptureState.Camera
        >;
        readonly screen?: ProtobufInstanceOf<
            typeof group_call.ParticipantToParticipant.CaptureState.Screen
        >;
    }): ProtobufInstanceOf<typeof group_call.ParticipantToParticipant.CaptureState> {
        return creator(group_call.ParticipantToParticipant.CaptureState, {
            microphone: state.microphone,
            camera: state.camera,
            screen: state.screen,
        });
    }

    it("decodes an 'encryptedAdminEnvelope' without interpreting it", () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(encode({encryptedAdminEnvelope: bytes(8)}));

        // Assert
        expect(envelope.content).toBe('encryptedAdminEnvelope');
    });

    it("decodes a 'rekey'", () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                rekey: creator(group_call.ParticipantToParticipant.MediaKey, {
                    epoch: 3,
                    ratchetCounter: 4,
                    pcmk: PCMK,
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('rekey');
        const rekey = unwrap(envelope.rekey);
        expect(rekey.epoch).toBe(3);
        expect(rekey.ratchetCounter).toBe(4);
        expectBytes(rekey.pcmk.unwrap(), PCMK);
    });

    it("decodes a 'holdState' without interpreting it", () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({holdState: creator(group_call.ParticipantToParticipant.HoldState, {})}),
        );

        // Assert
        expect(envelope.content).toBe('holdState');
    });

    it('accepts an envelope whose content is a variant it does not know', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(encode({}));

        // Assert
        expect(envelope.content).toBeUndefined();
    });

    it.each([
        {state: 'on', expected: 'on'},
        {state: 'off', expected: 'off'},
    ] as const)('decodes a microphone that is $state', ({state, expected}) => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    microphone: creator(
                        group_call.ParticipantToParticipant.CaptureState.Microphone,
                        {on: undefined, off: undefined, [state]: UNIT},
                    ),
                }),
            }),
        );

        // Assert
        expect(envelope.content).toBe('captureState');
        expect(unwrap(envelope.captureState)).toStrictEqual({
            state: 'microphone',
            microphone: expected,
            camera: undefined,
            screen: undefined,
        });
    });

    it('decodes a microphone in a state it does not know', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    microphone: creator(
                        group_call.ParticipantToParticipant.CaptureState.Microphone,
                        {on: undefined, off: undefined},
                    ),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).microphone).toBeUndefined();
    });

    it.each([
        {state: 'on', expected: 'on'},
        {state: 'off', expected: 'off'},
    ] as const)('decodes a camera that is $state', ({state, expected}) => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    camera: creator(group_call.ParticipantToParticipant.CaptureState.Camera, {
                        on: undefined,
                        off: undefined,
                        [state]: UNIT,
                    }),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).camera).toBe(expected);
    });

    it('decodes a camera in a state it does not know', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    camera: creator(group_call.ParticipantToParticipant.CaptureState.Camera, {
                        on: undefined,
                        off: undefined,
                    }),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).camera).toBeUndefined();
    });

    it('decodes a screen share that is on, keeping the time it started at', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    screen: creator(group_call.ParticipantToParticipant.CaptureState.Screen, {
                        on: creator(group_call.ParticipantToParticipant.CaptureState.Screen.On, {
                            startedAt: intoUnsignedLong(1337n as u64),
                        }),
                        off: undefined,
                    }),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).screen).toStrictEqual({startedAt: 1337n});
    });

    it('decodes a screen share that is off', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    screen: creator(group_call.ParticipantToParticipant.CaptureState.Screen, {
                        on: undefined,
                        off: UNIT,
                    }),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).screen).toBe('off');
    });

    it('decodes a screen share in a state it does not know', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(
            encode({
                captureState: captureState({
                    screen: creator(group_call.ParticipantToParticipant.CaptureState.Screen, {
                        on: undefined,
                        off: undefined,
                    }),
                }),
            }),
        );

        // Assert
        expect(unwrap(envelope.captureState).screen).toBeUndefined();
    });

    it('decodes a capture state for a device it does not know', () => {
        // Act
        const envelope = P2P_ENVELOPE_SCHEMA.parse(encode({captureState: captureState({})}));

        // Assert
        expect(unwrap(envelope.captureState).state).toBeUndefined();
    });
});
