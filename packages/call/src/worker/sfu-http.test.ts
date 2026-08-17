import {group_call} from '@threema/protocol/protobuf';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import type {u64} from '@threema/ts-utils/integer/u64';
import {unwrap} from '@threema/ts-utils/meta/unwrap';
import {intoUnsignedLong} from '@threema/ts-utils/number/into-unsigned-long';
import {ensureDtlsFingerprint} from '@threema/webrtc/sdp';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {createGroupCallId} from '../call-id.js';
import {GroupCallError, type GroupCallErrorType} from '../error.js';
import type {GroupCallStateKeyBox} from '../key.js';
import {creator, creatorForMap} from '../protobuf.js';

import {
    FetchSfuHttpClient,
    type SfuCallData,
    type SfuHttpClient,
    type SfuHttpLoggerFactory,
} from './sfu-http.js';

/** Bytes with a recognisable, non-zero pattern. */
function bytes(length: number, seed = 1): Uint8Array {
    return Uint8Array.from({length}, (_, index) => ((index + seed) % 255) + 1);
}

const NO_PADDING = new Uint8Array(0);
const CALL_ID = createGroupCallId(bytes(32));
const FINGERPRINT = ensureDtlsFingerprint(bytes(32, 7));
const TOKEN = 'the-sfu-token';
const USER_AGENT = 'Threema/Test';
const PROTOCOL_VERSION = 1;

/**
 * Note: The base URL deliberately carries a path prefix and a trailing slash, so that the tests pin
 * how a request path is resolved against it.
 */
const SFU_BASE_URL = new URL('https://sfu.threema.test/sfu/');

/** The nonce-ahead guard demands at least a nonce plus a MAC. */
const ENCRYPTED_CALL_STATE = bytes(24 + 16, 3);

/** A request the client made. */
interface RecordedRequest {
    readonly url: string;
    readonly init: RequestInit;
}

/** A log record the client emitted. */
interface RecordedLog {
    readonly tag: string;
    readonly level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    readonly data: readonly unknown[];
}

const REQUESTS: RecordedRequest[] = [];
const LOGS: RecordedLog[] = [];

/** Responds to a request. Set by each test that expects one. */
let respond: ((request: RecordedRequest) => Response | Promise<Response>) | undefined;

const LOGGING: SfuHttpLoggerFactory = {
    logger: (tag) => ({
        trace: (...data) => LOGS.push({tag, level: 'trace', data}),
        debug: (...data) => LOGS.push({tag, level: 'debug', data}),
        info: (...data) => LOGS.push({tag, level: 'info', data}),
        warn: (...data) => LOGS.push({tag, level: 'warn', data}),
        error: (...data) => LOGS.push({tag, level: 'error', data}),
    }),
};

/**
 * A Call State Key box whose decryptor either hands out `plainData` or throws.
 *
 * Note: The box itself is covered by the crypto package, so this stub only decides whether the call
 * state of a peek response can be decrypted.
 */
function stateKeyBox(
    decrypt: (encryptedWithNonceAhead: ReadonlyUint8Array) => Uint8Array,
): GroupCallStateKeyBox {
    return {
        decryptorWithNonceAhead: (token: unknown, encryptedWithNonceAhead: ReadonlyUint8Array) => ({
            decrypt: () => ({plainData: decrypt(encryptedWithNonceAhead)}),
        }),
    } as unknown as GroupCallStateKeyBox;
}

/** A Call State Key box that cannot decrypt anything. */
function undecryptableStateKeyBox(): GroupCallStateKeyBox {
    return stateKeyBox(() => {
        throw new Error('Decryption failed');
    });
}

function callData(gcsk: GroupCallStateKeyBox = undecryptableStateKeyBox()): SfuCallData {
    return {
        callId: CALL_ID,
        gcsk,
        sfuBaseUrl: SFU_BASE_URL,
        protocolVersion: PROTOCOL_VERSION,
    };
}

/** Encode a call state the way the SFU would (i.e. as the plaintext of the encrypted call state). */
function encodeCallState(
    participants: readonly [participantId: string, identity: string, nickname: string][],
): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
        group_call.CallState.encode(
            creator(group_call.CallState, {
                padding: NO_PADDING,
                stateCreatedBy: 1,
                stateCreatedAt: intoUnsignedLong(1337n as u64),
                participants: creatorForMap(
                    group_call.CallState.Participant,
                    participants.map(([participantId, identity, nickname]) => [
                        participantId,
                        creator(group_call.CallState.Participant, {
                            threema: creator(group_call.CallState.Participant.Normal, {
                                identity,
                                nickname,
                            }),
                            guest: undefined,
                        }),
                    ]),
                ),
            }),
        ).finish(),
    );
}

function encodePeekResponse(encryptedCallState?: Uint8Array): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
        group_call.SfuHttpResponse.Peek.encode(
            creator(group_call.SfuHttpResponse.Peek, {
                startedAt: intoUnsignedLong(42n as u64),
                maxParticipants: 16,
                encryptedCallState,
            }),
        ).finish(),
    );
}

function encodeJoinResponse(dtlsFingerprint: Uint8Array = bytes(32)): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
        group_call.SfuHttpResponse.Join.encode(
            creator(group_call.SfuHttpResponse.Join, {
                startedAt: intoUnsignedLong(42n as u64),
                maxParticipants: 16,
                participantId: 3,
                addresses: [
                    creator(group_call.SfuHttpResponse.Join.Address, {
                        protocol: group_call.SfuHttpResponse.Join.Address.Protocol.UDP,
                        port: 12345,
                        ip: '192.0.2.1',
                    }),
                ],
                iceUsernameFragment: 'ufrag',
                icePassword: 'a'.repeat(22),
                dtlsFingerprint,
                rtpHeaderExtensionIds: undefined,
                supportedFeatures: undefined,
            }),
        ).finish(),
    );
}

/** A response with the given status and a body that cannot be read. */
function unreadableResponse(status: number): Response {
    return new Response(
        new ReadableStream({
            start: (controller) => controller.error(new Error('The body exploded')),
        }),
        {status},
    );
}

/**
 * Await the rejection of `promise` and assert that it is a {@link GroupCallError} of the expected
 * type.
 */
async function expectGroupCallError(
    promise: Promise<unknown>,
    type: GroupCallErrorType,
): Promise<GroupCallError> {
    const error = await promise.then(
        () => expect.fail('Expected the request to be rejected'),
        (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(GroupCallError);
    const groupCallError = error as GroupCallError;
    expect(groupCallError.type).toStrictEqual(type);
    return groupCallError;
}

beforeEach(() => {
    REQUESTS.length = 0;
    LOGS.length = 0;
    respond = undefined;
    vi.stubGlobal('fetch', async (url: URL, init: RequestInit): Promise<Response> => {
        const request: RecordedRequest = {url: url.toString(), init};
        REQUESTS.push(request);
        return await unwrap(respond, 'Unexpected request')(request);
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

// Note: Every code path is exercised both with and without an injected logger, because the client
// must behave identically either way (and must not construct a message when no logger was given).
describe.each([
    {variant: 'with an injected logger', logging: LOGGING},
    {variant: 'without an injected logger', logging: undefined},
])('FetchSfuHttpClient $variant', ({logging}) => {
    let client: SfuHttpClient;

    beforeEach(() => {
        client = new FetchSfuHttpClient({userAgent: USER_AGENT, logging});
    });

    describe('peek', () => {
        it('encodes the request and decodes the response', async () => {
            // Arrange
            respond = () => new Response(encodePeekResponse());

            // Act
            const result = await client.peek(callData(), TOKEN);

            // Assert: Request
            const request = unwrap(REQUESTS[0]);
            expect(REQUESTS).toHaveLength(1);
            expect(request.url).toBe(`https://sfu.threema.test/sfu/v1/peek/${CALL_ID.id}`);
            expect(request.init.method).toBe('POST');
            expect(request.init.cache).toBe('no-store');
            expect(request.init.credentials).toBe('omit');
            expect(request.init.referrerPolicy).toBe('no-referrer');
            expect(request.init.headers).toStrictEqual({
                'content-type': 'application/octet-stream',
                'user-agent': USER_AGENT,
                'authorization': `ThreemaSfuToken ${TOKEN}`,
            });
            const peek = group_call.SfuHttpRequest.Peek.decode(
                new Uint8Array(unwrap(request.init.body) as Uint8Array),
            );
            expect(Uint8Array.from(peek.callId)).toStrictEqual(Uint8Array.from(CALL_ID.bytes));

            // Assert: Response
            expect(result).toStrictEqual({
                startedAt: new Date(42),
                maxParticipants: 16,
                participants: undefined,
            });
        });

        it('decrypts the call state and reduces it to the participants', async () => {
            // Arrange
            const callState = encodeCallState([
                ['1', 'ECHOECHO', 'Echo'],
                ['2', 'MEMEMEME', 'Me'],
            ]);
            respond = () => new Response(encodePeekResponse(ENCRYPTED_CALL_STATE));

            // Act
            const result = await client.peek(callData(stateKeyBox(() => callState)), TOKEN);

            // Assert
            expect(result?.participants).toStrictEqual(['ECHOECHO', 'MEMEMEME']);
        });

        it('handles a call state that cannot be decrypted as if it was absent', async () => {
            // Arrange
            respond = () => new Response(encodePeekResponse(ENCRYPTED_CALL_STATE));

            // Act
            const result = await client.peek(callData(undecryptableStateKeyBox()), TOKEN);

            // Assert
            expect(result).toStrictEqual({
                startedAt: new Date(42),
                maxParticipants: 16,
                participants: undefined,
            });
        });

        it('handles a call state that cannot be decoded as if it was absent', async () => {
            // Arrange
            respond = () => new Response(encodePeekResponse(ENCRYPTED_CALL_STATE));

            // Act: Decryption succeeds but yields a call state with an invalid Threema ID
            const result = await client.peek(
                callData(stateKeyBox(() => encodeCallState([['1', 'nope', '']]))),
                TOKEN,
            );

            // Assert
            expect(result?.participants).toBeUndefined();
        });

        it('treats a not-found response as no running call', async () => {
            // Arrange
            respond = () => new Response(undefined, {status: 404});

            // Act
            const result = await client.peek(callData(), TOKEN);

            // Assert
            expect(result).toBeUndefined();
        });

        it('rejects a non-success response with the status code', async () => {
            // Arrange
            respond = () => new Response('nope', {status: 500});

            // Act & assert
            await expectGroupCallError(client.peek(callData(), TOKEN), {
                kind: 'sfu-status-code',
                status: 500,
            });
        });

        it('rejects when the request itself fails', async () => {
            // Arrange
            const cause = new Error('No connectivity');
            respond = () => {
                throw cause;
            };

            // Act
            const error = await expectGroupCallError(client.peek(callData(), TOKEN), {
                kind: 'sfu-fetch',
            });

            // Assert
            expect(error.message).toBe('Peeking failed');
            expect(error.cause).toBe(cause);
        });

        it('rejects a response that cannot be decoded', async () => {
            // Arrange: An encrypted call state that is too short to be one
            respond = () => new Response(encodePeekResponse(bytes(39)));

            // Act
            const error = await expectGroupCallError(client.peek(callData(), TOKEN), {
                kind: 'sfu-invalid-data',
            });

            // Assert
            expect(error.message).toBe('Unable to decode SFU peek response');
        });

        it('times out and aborts the request', async () => {
            // Arrange
            vi.useFakeTimers();
            respond = async () =>
                await new Promise<Response>(() => {
                    // Never responds.
                });

            // Act
            const assertion = expectGroupCallError(client.peek(callData(), TOKEN), {
                kind: 'sfu-timeout',
            });
            await vi.advanceTimersByTimeAsync(5_000);
            const error = await assertion;

            // Assert
            expect(error.message).toBe('Timer timed out after 5000ms');
            expect(unwrap(unwrap(REQUESTS[0]).init.signal).aborted).toBe(true);
        });
    });

    describe('join', () => {
        it('encodes the request and decodes the response', async () => {
            // Arrange
            respond = () => new Response(encodeJoinResponse());

            // Act
            const result = await client.join(callData(), FINGERPRINT, TOKEN);

            // Assert: Request
            const request = unwrap(REQUESTS[0]);
            expect(REQUESTS).toHaveLength(1);
            expect(request.url).toBe(`https://sfu.threema.test/sfu/v1/join/${CALL_ID.id}`);
            expect(request.init.method).toBe('POST');
            expect(request.init.cache).toBe('no-store');
            expect(request.init.credentials).toBe('omit');
            expect(request.init.referrerPolicy).toBe('no-referrer');
            expect(request.init.headers).toStrictEqual({
                'content-type': 'application/octet-stream',
                'user-agent': USER_AGENT,
                'authorization': `ThreemaSfuToken ${TOKEN}`,
            });
            const join = group_call.SfuHttpRequest.Join.decode(
                new Uint8Array(unwrap(request.init.body) as Uint8Array),
            );
            expect(Uint8Array.from(join.callId)).toStrictEqual(Uint8Array.from(CALL_ID.bytes));
            expect(join.protocolVersion).toBe(PROTOCOL_VERSION);
            expect(Uint8Array.from(join.dtlsFingerprint)).toStrictEqual(
                Uint8Array.from(FINGERPRINT),
            );

            // Assert: Response
            expect(result.startedAt).toStrictEqual(new Date(42));
            expect(result.maxParticipants).toBe(16);
            expect(result.participantId).toBe(3);
            expect(result.addresses).toStrictEqual([
                {
                    protocol: group_call.SfuHttpResponse.Join.Address.Protocol.UDP.valueOf(),
                    port: 12345,
                    ip: '192.0.2.1',
                },
            ]);
        });

        it('rejects a non-success response with the status code', async () => {
            // Arrange
            respond = () => new Response('nope', {status: 500});

            // Act & assert
            await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
                kind: 'sfu-status-code',
                status: 500,
            });
        });

        // Note: The distinct meaning of this status — the call is full — is interpreted by the
        // caller, so all this client has to do is surface the status code verbatim.
        it('surfaces the call-full status code', async () => {
            // Arrange
            respond = () => new Response('full', {status: 503});

            // Act & assert
            await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
                kind: 'sfu-status-code',
                status: 503,
            });
        });

        it('rejects when the request itself fails', async () => {
            // Arrange
            const cause = new Error('No connectivity');
            respond = () => {
                throw cause;
            };

            // Act
            const error = await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
                kind: 'sfu-fetch',
            });

            // Assert
            expect(error.message).toBe('Joining failed');
            expect(error.cause).toBe(cause);
        });

        it('rejects a response that cannot be decoded', async () => {
            // Arrange: A DTLS fingerprint of the wrong length
            respond = () => new Response(encodeJoinResponse(bytes(31)));

            // Act
            const error = await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
                kind: 'sfu-invalid-data',
            });

            // Assert
            expect(error.message).toBe('Unable to decode SFU join response');
        });

        it('times out and aborts the request', async () => {
            // Arrange
            vi.useFakeTimers();
            respond = async () =>
                await new Promise<Response>(() => {
                    // Never responds.
                });

            // Act
            const assertion = expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
                kind: 'sfu-timeout',
            });
            await vi.advanceTimersByTimeAsync(10_000);
            const error = await assertion;

            // Assert
            expect(error.message).toBe('Timer timed out after 10000ms');
            expect(unwrap(unwrap(REQUESTS[0]).init.signal).aborted).toBe(true);
        });
    });
});

// Note: The non-success path logs the body of the response, so a body that cannot be read surfaces
// as an unexpected error — but only when a logger was injected, because an optional-chained log call
// short-circuits the evaluation of its arguments.
describe('FetchSfuHttpClient with a response body that cannot be read', () => {
    it.each([
        {
            method: 'peek',
            act: async (client: SfuHttpClient) => await client.peek(callData(), TOKEN),
        },
        {
            method: 'join',
            act: async (client: SfuHttpClient) => await client.join(callData(), FINGERPRINT, TOKEN),
        },
    ])('rejects an unexpected error of $method as a fetch error', async ({act}) => {
        // Arrange
        const client = new FetchSfuHttpClient({userAgent: USER_AGENT, logging: LOGGING});
        respond = () => unreadableResponse(500);

        // Act
        const error = await expectGroupCallError(act(client), {kind: 'sfu-fetch'});

        // Assert
        expect(error.message).toBe('The body exploded');
    });

    it('does not read the body when no logger was injected', async () => {
        // Arrange
        const client = new FetchSfuHttpClient({userAgent: USER_AGENT});
        respond = () => unreadableResponse(500);

        // Act & assert: The status code is surfaced instead of the body read failing.
        await expectGroupCallError(client.peek(callData(), TOKEN), {
            kind: 'sfu-status-code',
            status: 500,
        });
    });
});

// Note: These are the diagnostics that make a call with no audio investigable in the field, so they
// are asserted explicitly rather than left to the round-trip tests above.
describe('FetchSfuHttpClient diagnostics', () => {
    let client: SfuHttpClient;

    beforeEach(() => {
        client = new FetchSfuHttpClient({userAgent: USER_AGENT, logging: LOGGING});
    });

    /** All log records of the given level, with their tag. */
    function logs(level: RecordedLog['level']): readonly {tag: string; message: unknown}[] {
        return LOGS.filter((log) => log.level === level).map((log) => ({
            tag: log.tag,
            message: log.data[0],
        }));
    }

    it('tags the loggers with the shortened call id', async () => {
        // Arrange
        respond = () => new Response(encodePeekResponse());

        // Act
        await client.peek(callData(), TOKEN);

        // Assert
        expect(logs('debug').map((log) => log.tag)).toStrictEqual([
            `sfu-http.peek.${CALL_ID.shortened}`,
            `sfu-http.peek.${CALL_ID.shortened}`,
        ]);
        expect(logs('debug').map((log) => log.message)).toStrictEqual(['Peeking', 'Peeked']);
    });

    it('warns when the call state cannot be decrypted', async () => {
        // Arrange
        respond = () => new Response(encodePeekResponse(ENCRYPTED_CALL_STATE));

        // Act
        await client.peek(callData(undecryptableStateKeyBox()), TOKEN);

        // Assert
        expect(logs('warn')).toStrictEqual([
            {
                tag: `sfu-http.peek.${CALL_ID.shortened}`,
                message: `Unable to decrypt or decode call state (length=${ENCRYPTED_CALL_STATE.byteLength}), continuing without it`,
            },
        ]);
    });

    it('warns when peeking fails', async () => {
        // Arrange
        respond = () => new Response('nope', {status: 500});

        // Act
        await expectGroupCallError(client.peek(callData(), TOKEN), {
            kind: 'sfu-status-code',
            status: 500,
        });

        // Assert
        expect(logs('warn')).toStrictEqual([
            {
                tag: `sfu-http.peek.${CALL_ID.shortened}`,
                message: 'Peeking failed, response: nope (500)',
            },
        ]);
    });

    it('warns when a peek response is invalid', async () => {
        // Arrange
        respond = () => new Response(encodePeekResponse(bytes(39)));

        // Act
        await expectGroupCallError(client.peek(callData(), TOKEN), {kind: 'sfu-invalid-data'});

        // Assert
        expect(logs('warn').map((log) => log.message)).toStrictEqual(['Invalid peek response']);
    });

    it('warns when joining fails', async () => {
        // Arrange
        respond = () => new Response('nope', {status: 503});

        // Act
        await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
            kind: 'sfu-status-code',
            status: 503,
        });

        // Assert
        expect(logs('warn')).toStrictEqual([
            {
                tag: `sfu-http.join.${CALL_ID.shortened}`,
                message: 'Joining failed, response: nope (503)',
            },
        ]);
    });

    it('warns when a join response is invalid', async () => {
        // Arrange
        respond = () => new Response(encodeJoinResponse(bytes(31)));

        // Act
        await expectGroupCallError(client.join(callData(), FINGERPRINT, TOKEN), {
            kind: 'sfu-invalid-data',
        });

        // Assert
        expect(logs('warn').map((log) => log.message)).toStrictEqual(['Invalid join response']);
    });
});
