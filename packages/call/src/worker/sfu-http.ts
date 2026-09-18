// Note: This module lives below the package's worker entry point because the SFU HTTP client is
// built on `fetch` and `AbortController`, i.e. globals that only exist in a DOM or a WebWorker
// context. The platform-neutral top-level entry point cannot even name them.

import {CREATE_BUFFER_TOKEN} from '@threema/crypto';
import type {BaseUrl} from '@threema/domain';
import {group_call} from '@threema/protocol/protobuf';
import {creator} from '@threema/protocol/protobuf/utils';
import type {ReadonlyUint8Array} from '@threema/ts-utils/array/readonly-uint8-array';
import {ensureArrayBufferBackedView} from '@threema/ts-utils/byte/array-buffer-backed-view';
import type {u53} from '@threema/ts-utils/integer/u53';
import type {Logger} from '@threema/ts-utils/logging/logger';
import {ensureError} from '@threema/ts-utils/meta/ensure-error';
import {TIMER} from '@threema/ts-utils/timer/global-timer';
import {TimeoutError} from '@threema/ts-utils/timer/timeout-error';
import type {DtlsFingerprint} from '@threema/webrtc/sdp';

import type {GroupCallId} from '../call-id.js';
import {GroupCallError} from '../error.js';
import type {GroupCallStateKeyBox} from '../key.js';
import {
    CALL_STATE_SNAPSHOT_SCHEMA,
    JOIN_RESPONSE_SCHEMA,
    PEEK_RESPONSE_SCHEMA,
    type JoinResponse,
    type PeekCallStateSnapshot,
} from '../schema.js';
import type {SfuPeekResult} from '../sfu.js';

const TIMEOUT_MS = {
    PEEK: 5_000,
    JOIN: 10_000,
} as const;

/**
 * The call properties an {@link SfuHttpClient} needs in order to peek or join a call.
 *
 * Note: This is deliberately narrowed to exactly the values the client reads, so that an app does
 * not have to hand over its own (potentially much larger) call data structure.
 */
export interface SfuCallData {
    /** Call ID of the call to be peeked or joined. */
    readonly callId: GroupCallId;
    /** Call State Key box, used to decrypt the call state of a _peek_ response. */
    readonly gcsk: GroupCallStateKeyBox;
    /** SFU base URL to make _peek_ and _join_ calls to. */
    readonly sfuBaseUrl: BaseUrl;
    /** Protocol version used in the announcement. */
    readonly protocolVersion: u53;
}

/**
 * Hands out the loggers of an {@link SfuHttpClient}.
 *
 * Note: This is the structural subset of an app's logger factory that the client needs, so that this
 * package does not depend on an app's logging implementation.
 */
export interface SfuHttpLoggerFactory {
    readonly logger: (tag: string) => Logger;
}

/**
 * Options of a {@link FetchSfuHttpClient}.
 */
export interface SfuHttpClientOptions {
    /** User agent to be sent with every request. */
    readonly userAgent: string;
    /**
     * Optional logger factory.
     *
     * Note: When omitted, no log message is constructed in the first place.
     */
    readonly logging?: SfuHttpLoggerFactory;
}

export interface SfuHttpClient {
    /**
     * Peek a call on the SFU.
     *
     * @param data Call properties of the call to be peeked.
     * @param token SFU token to authenticate with. How it is obtained is up to the app.
     * @returns the current call state (if known) or `undefined` (which still means the call
     *   exists).
     * @throws {GroupCallError} if something went wrong.
     */
    peek: (data: SfuCallData, token: string) => Promise<SfuPeekResult | undefined>;

    /**
     * Join or create a call on the SFU.
     *
     * Note: If no call with the provided call ID is active, the call will be created.
     *
     * @param data Call properties of the call to be joined.
     * @param fingerprint DTLS fingerprint of the local certificate.
     * @param token SFU token to authenticate with. How it is obtained is up to the app.
     * @returns necessary information to connect to the call via WebRTC.
     * @throws {GroupCallError} if something went wrong.
     */
    join: (data: SfuCallData, fingerprint: DtlsFingerprint, token: string) => Promise<JoinResponse>;
}

/**
 * An {@link SfuHttpClient} implemented on top of `fetch`.
 */
export class FetchSfuHttpClient implements SfuHttpClient {
    private readonly _headers: Record<string, string>;
    private readonly _logging: SfuHttpLoggerFactory | undefined;

    public constructor(options: SfuHttpClientOptions) {
        this._headers = {
            'content-type': 'application/octet-stream',
            'user-agent': options.userAgent,
        };
        this._logging = options.logging;
    }

    /** @inheritdoc */
    public async peek(data: SfuCallData, token: string): Promise<SfuPeekResult | undefined> {
        const log = this._logging?.logger(`sfu-http.peek.${data.callId.shortened}`);

        // Peek the call on the SFU
        const abort = new AbortController();
        const run = async (): Promise<SfuPeekResult | undefined> => {
            log?.debug('Peeking');
            let response;
            try {
                response = await this._fetch(`v1/peek/${data.callId.id}`, data.sfuBaseUrl, token, {
                    signal: abort.signal,
                    method: 'POST',
                    body: ensureArrayBufferBackedView(
                        group_call.SfuHttpRequest.Peek.encode(
                            creator(group_call.SfuHttpRequest.Peek, {
                                callId: data.callId.bytes as Uint8Array,
                            }),
                        ).finish(),
                    ),
                });
            } catch (error) {
                log?.warn('Peeking failed', error);
                throw new GroupCallError({kind: 'sfu-fetch'}, 'Peeking failed', {from: error});
            }
            if (response.status === 404) {
                return undefined;
            }
            if (response.status !== 200) {
                log?.warn(
                    `Peeking failed, response: ${await response.text()} (${response.status})`,
                );
                throw new GroupCallError(
                    {kind: 'sfu-status-code', status: response.status},
                    'SFU rejected the peek request',
                );
            }

            // Decode the peek response
            let peekResponse;
            try {
                peekResponse = PEEK_RESPONSE_SCHEMA.parse(
                    group_call.SfuHttpResponse.Peek.decode(
                        new Uint8Array(await response.arrayBuffer()),
                    ),
                );
            } catch (error) {
                log?.warn('Invalid peek response', error);
                throw new GroupCallError(
                    {kind: 'sfu-invalid-data'},
                    'Unable to decode SFU peek response',
                    {from: error},
                );
            }

            // Decrypt the call state snapshot of the peek response (if any and if valid)
            let snapshot: PeekCallStateSnapshot | undefined;
            if (peekResponse.encryptedCallState !== undefined) {
                try {
                    const {plainData} = data.gcsk
                        .decryptorWithNonceAhead(
                            CREATE_BUFFER_TOKEN,
                            peekResponse.encryptedCallState,
                        )
                        .decrypt(undefined);
                    snapshot = CALL_STATE_SNAPSHOT_SCHEMA.parse(
                        group_call.CallState.decode(plainData),
                    );
                } catch {
                    // Handle as if it was not present
                    log?.warn(
                        `Unable to decrypt or decode call state (length=${peekResponse.encryptedCallState.byteLength}), continuing without it`,
                    );
                }
            }

            // Enough of the peek show
            const result: SfuPeekResult = {
                startedAt: peekResponse.startedAt,
                maxParticipants: peekResponse.maxParticipants,
                participants:
                    snapshot === undefined
                        ? undefined
                        : Object.values(snapshot.participants).map(
                              (participant) => participant.identity,
                          ),
            };
            log?.debug('Peeked', result);
            return result;
        };

        try {
            return await TIMER.waitFor(run(), TIMEOUT_MS.PEEK);
        } catch (error_) {
            const error = ensureError(error_);
            if (error instanceof TimeoutError) {
                // Abort any ongoing `fetch` request
                abort.abort();
                throw new GroupCallError({kind: 'sfu-timeout'}, error.message, {from: error});
            }
            if (error instanceof GroupCallError) {
                throw error;
            }
            throw new GroupCallError({kind: 'sfu-fetch'}, error.message, {from: error});
        }
    }

    /** @inheritdoc */
    public async join(
        data: SfuCallData,
        fingerprint: DtlsFingerprint,
        token: string,
    ): Promise<JoinResponse> {
        const log = this._logging?.logger(`sfu-http.join.${data.callId.shortened}`);

        // Join the call on the SFU
        const abort = new AbortController();
        const run = async (): Promise<JoinResponse> => {
            log?.debug('Joining');
            let response;
            try {
                response = await this._fetch(`v1/join/${data.callId.id}`, data.sfuBaseUrl, token, {
                    signal: abort.signal,
                    method: 'POST',
                    body: ensureArrayBufferBackedView(
                        group_call.SfuHttpRequest.Join.encode(
                            creator(group_call.SfuHttpRequest.Join, {
                                callId: data.callId.bytes as Uint8Array,
                                protocolVersion: data.protocolVersion,
                                dtlsFingerprint: fingerprint as ReadonlyUint8Array as Uint8Array,
                            }),
                        ).finish(),
                    ),
                });
            } catch (error) {
                log?.warn('Joining failed', error);
                throw new GroupCallError({kind: 'sfu-fetch'}, 'Joining failed', {from: error});
            }
            if (response.status !== 200) {
                log?.warn(
                    `Joining failed, response: ${await response.text()} (${response.status})`,
                );
                throw new GroupCallError(
                    {kind: 'sfu-status-code', status: response.status},
                    'SFU rejected the join request',
                );
            }

            // Decode the join response
            let result;
            try {
                result = JOIN_RESPONSE_SCHEMA.parse(
                    group_call.SfuHttpResponse.Join.decode(
                        new Uint8Array(await response.arrayBuffer()),
                    ),
                );
            } catch (error) {
                log?.warn('Invalid join response', error);
                throw new GroupCallError(
                    {kind: 'sfu-invalid-data'},
                    'Unable to decode SFU join response',
                    {from: error},
                );
            }

            // Your turn, WebRTC
            log?.debug('Joined', result);
            return result;
        };

        try {
            return await TIMER.waitFor(run(), TIMEOUT_MS.JOIN);
        } catch (error_) {
            const error = ensureError(error_);
            if (error instanceof TimeoutError) {
                // Abort any ongoing `fetch` request
                abort.abort();
                throw new GroupCallError({kind: 'sfu-timeout'}, error.message, {from: error});
            }
            if (error instanceof GroupCallError) {
                throw error;
            }
            throw new GroupCallError({kind: 'sfu-fetch'}, error.message, {from: error});
        }
    }

    private async _fetch(
        path: string,
        base: BaseUrl,
        token: string,
        init: RequestInit,
    ): Promise<Response> {
        return await fetch(new URL(path, base), {
            ...init,
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                // eslint-disable-next-line @typescript-eslint/no-misused-spread
                ...init.headers,
                ...this._headers,
                authorization: `ThreemaSfuToken ${token}`,
            },
        });
    }
}
