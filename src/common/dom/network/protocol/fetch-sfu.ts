import type {ServicesForBackend} from '~/common/backend';
import {CREATE_BUFFER_TOKEN} from '~/common/crypto/box';
import * as protobuf from '~/common/network/protobuf';
import type {
    PeekCallStateSnapshot,
    JoinResponse,
} from '~/common/network/protobuf/validate/group-call';
import {type GroupCallBaseData, GroupCallError} from '~/common/network/protocol/call/group-call';
import type {SfuToken} from '~/common/network/protocol/directory';
import type {PeekResponse, SfuHttpBackend} from '~/common/network/protocol/sfu';
import type {BaseUrl} from '~/common/network/types';
import type {ReadonlyUint8Array} from '~/common/types';
import {ensureError} from '~/common/utils/assert';
import {TIMER, TimeoutError} from '~/common/utils/timer';
import type {DtlsFingerprint} from '~/common/webrtc';

const TIMEOUT_MS = {
    PEEK: 5_000,
    JOIN: 10_000,
} as const;

export class FetchSfuHttpBackend implements SfuHttpBackend {
    private readonly _headers: Record<string, string>;

    public constructor(private readonly _services: Pick<ServicesForBackend, 'config' | 'logging'>) {
        this._headers = {
            'content-type': 'application/octet-stream',
            'user-agent': _services.config.USER_AGENT,
        };
    }

    /** @inheritdoc */
    public async peek(data: GroupCallBaseData, token: SfuToken): Promise<PeekResponse | undefined> {
        const log = this._services.logging.logger(
            `sfu-http.peek.${data.derivations.callId.shortened}`,
        );

        // Peek the call on the SFU
        const abort = new AbortController();
        const run = async (): Promise<PeekResponse | undefined> => {
            log.debug('Peeking');
            let response;
            try {
                response = await this._fetch(
                    `v1/peek/${data.derivations.callId.id}`,
                    data.sfuBaseUrl.parsed,
                    token,
                    {
                        signal: abort.signal,
                        method: 'POST',
                        body: protobuf.groupcall.SfuHttpRequest.Peek.encode(
                            protobuf.utils.creator(protobuf.groupcall.SfuHttpRequest.Peek, {
                                callId: data.derivations.callId.bytes as Uint8Array,
                            }),
                        ).finish(),
                    },
                );
            } catch (error) {
                log.warn('Peeking failed', error);
                throw new GroupCallError({kind: 'sfu-fetch'}, 'Peeking failed', {from: error});
            }
            if (response.status === 404) {
                return undefined;
            }
            if (response.status !== 200) {
                log.warn(`Peeking failed, response: ${await response.text()} (${response.status})`);
                throw new GroupCallError(
                    {kind: 'sfu-status-code', status: response.status},
                    'SFU rejected the peek request',
                );
            }

            // Decode the peek response
            let peekResponse;
            try {
                peekResponse = protobuf.validate.group_call.PEEK_RESPONSE_SCHEMA.parse(
                    protobuf.groupcall.SfuHttpResponse.Peek.decode(
                        new Uint8Array(await response.arrayBuffer()),
                    ),
                );
            } catch (error) {
                log.warn('Invalid peek response', error);
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
                    const {plainData} = data.derivations.gcsk
                        .decryptorWithNonceAhead(
                            CREATE_BUFFER_TOKEN,
                            peekResponse.encryptedCallState,
                        )
                        .decrypt(undefined);
                    snapshot = protobuf.validate.group_call.CALL_STATE_SNAPSHOT_SCHEMA.parse(
                        protobuf.groupcall.CallState.decode(plainData),
                    );
                } catch (error) {
                    // Handle as if it was not present
                    log.warn(
                        `Unable to decrypt or decode call state (length=${peekResponse.encryptedCallState.byteLength}), continuing without it`,
                    );
                }
            }

            // Enough of the peek show
            const result: PeekResponse = {
                startedAt: peekResponse.startedAt,
                maxParticipants: peekResponse.maxParticipants,
                participants:
                    snapshot === undefined
                        ? undefined
                        : Object.values(snapshot.participants).map(
                              (participant) => participant.identity,
                          ),
            };
            log.debug('Peeked', result);
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
        data: GroupCallBaseData,
        fingerprint: DtlsFingerprint,
        token: SfuToken,
    ): Promise<JoinResponse> {
        const log = this._services.logging.logger(
            `sfu-http.join.${data.derivations.callId.shortened}`,
        );

        // Join the call on the SFU
        const abort = new AbortController();
        const run = async (): Promise<JoinResponse> => {
            log.debug('Joining');
            let response;
            try {
                response = await this._fetch(
                    `v1/join/${data.derivations.callId.id}`,
                    data.sfuBaseUrl.parsed,
                    token,
                    {
                        signal: abort.signal,
                        method: 'POST',
                        body: protobuf.groupcall.SfuHttpRequest.Join.encode(
                            protobuf.utils.creator(protobuf.groupcall.SfuHttpRequest.Join, {
                                callId: data.derivations.callId.bytes as Uint8Array,
                                protocolVersion: data.protocolVersion,
                                dtlsFingerprint: fingerprint as ReadonlyUint8Array as Uint8Array,
                            }),
                        ).finish(),
                    },
                );
            } catch (error) {
                log.warn('Joining failed', error);
                throw new GroupCallError({kind: 'sfu-fetch'}, 'Joining failed', {from: error});
            }
            if (response.status !== 200) {
                log.warn(`Joining failed, response: ${await response.text()} (${response.status})`);
                throw new GroupCallError(
                    {kind: 'sfu-status-code', status: response.status},
                    'SFU rejected the join request',
                );
            }

            // Decode the join response
            let result;
            try {
                result = protobuf.validate.group_call.JOIN_RESPONSE_SCHEMA.parse(
                    protobuf.groupcall.SfuHttpResponse.Join.decode(
                        new Uint8Array(await response.arrayBuffer()),
                    ),
                );
            } catch (error) {
                log.warn('Invalid join response', error);
                throw new GroupCallError(
                    {kind: 'sfu-invalid-data'},
                    'Unable to decode SFU join response',
                    {from: error},
                );
            }

            // Your turn, WebRTC
            log.debug('Joined', result);
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
        token: SfuToken,
        init: RequestInit,
    ): Promise<Response> {
        return await fetch(new URL(path, base), {
            ...init,
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            headers: {
                ...init.headers,
                ...this._headers,
                authorization: `ThreemaSfuToken ${token.sfuToken}`,
            },
        });
    }
}
