import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {CONFIG} from '~/common/config';
import {wrapRawKey} from '~/common/crypto';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {randomBytes} from '~/common/dom/crypto/random';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {type DirectoryErrorType, DirectoryError} from '~/common/network/protocol/directory';
import {ensureIdentityString} from '~/common/network/types';
import {type ClientKey} from '~/common/network/types/keys';
import {type u53} from '~/common/types';
import {assertError, unreachable} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';

const {expect} = chai.use(sinonChai);

interface ChallengePayload {
    token: string;
    tokenRespKeyPub: string;
}

/**
 * Create a response.
 *
 * @param status The response status code
 * @param body The response body
 * @param authMode What authentication mode to use
 * @param challengePayload An optional challenge payload to use
 */
function makeResponse(
    status: u53,
    body: Record<string, unknown>,
    authMode: 'none' | 'challenge' | 'success' | 'failure',
    challengePayload?: ChallengePayload,
): Response {
    let responseBody;
    switch (authMode) {
        case 'none':
            responseBody = body;
            break;
        case 'challenge':
            responseBody = challengePayload ?? {
                token: u8aToBase64(Uint8Array.of(0xff, 1, 2, 3, 4, 5, 6)),
                tokenRespKeyPub: u8aToBase64(randomBytes(new Uint8Array(32))),
            };
            break;
        case 'success':
            responseBody = {
                success: true,
                ...body,
            };
            break;
        case 'failure':
            responseBody = {
                success: false,
                error: 'Mocked failure',
                ...body,
            };
            break;
        default:
            unreachable(authMode);
    }
    return new Response(JSON.stringify(responseBody), {
        status,
        headers: new Headers({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'application/json',
        }),
    });
}

/**
 * Options that influence how the responses are mocked.
 */
interface MockOptions {
    /**
     * Force authentication to always fail (success = false).
     */
    authFails?: boolean;
    /**
     * Override the challenge payload.
     */
    challengePayload?: ChallengePayload;
}

/**
 * Mock a `fetch()`-response.
 *
 * @param status The mocked response status code.
 * @param responseBody The response body.
 */
function mockFetchResponse(
    status: u53,
    responseBody: Record<string, unknown>,
    options?: MockOptions,
): void {
    const fakeFetch = sinon.fake(
        // eslint-disable-next-line @typescript-eslint/require-await
        async (input: RequestInfo, init?: RequestInit | undefined) => {
            // GET: No authentication
            if (init?.method === 'GET') {
                return makeResponse(status, responseBody, 'none');
            }

            // POST: Authentication
            const requestBody = (init?.body as string | undefined) ?? '';
            if (requestBody.includes('"response":')) {
                // Authenticated request
                return makeResponse(
                    status,
                    responseBody,
                    options?.authFails ?? false ? 'failure' : 'success',
                );
            } else {
                // Unauthenticated request
                return makeResponse(status, responseBody, 'challenge', options?.challengePayload);
            }
        },
    );
    sinon.replace(self, 'fetch', fakeFetch);
}

/**
 * Assert that awaiting the promise results in a {@link DirectoryError} of a certain type.
 */
async function assertDirectoryError(
    promise: Promise<unknown>,
    type: DirectoryErrorType,
    message?: string,
): Promise<void> {
    let thrown = false;
    try {
        await promise;
    } catch (error) {
        thrown = true;
        expect(error).to.be.instanceOf(DirectoryError);
        assertError(error, DirectoryError);
        expect(error.type).to.equal(type);
        if (message !== undefined) {
            expect(error.message, `Full error message: "${error.message}"\n`).to.contain(message);
        }
    }
    if (!thrown) {
        expect.fail('Expected a DirectoryError, but no exception was thrown');
    }
}

/**
 * Config tests.
 */
export function run(): void {
    describe('FetchDirectoryBackend', function () {
        const backend = new FetchDirectoryBackend({config: CONFIG});
        const crypto = new TweetNaClBackend(randomBytes);

        const ck = SecureSharedBoxFactory.consume(
            crypto,
            wrapRawKey(randomBytes(new Uint8Array(32))),
        ) as ClientKey;

        this.beforeEach(function () {
            sinon.restore();
        });

        describe('identity (unauthenticated)', function () {
            it('successful fetch', async function () {
                // Mock response
                const responseBody = {
                    identity: 'ECHOECHO',
                    publicKey: 'A77r4XgCosybW/RS11FXtJqkYn8yap8yaw/JvNX1RhI=',
                    featureLevel: 3,
                    featureMask: 9,
                    state: 0,
                    type: 0,
                } as const;
                mockFetchResponse(200, responseBody);

                // Fetch identity
                const validIdentity = await backend.identity(
                    ensureIdentityString(responseBody.identity),
                );
                expect(validIdentity.identity).to.equal(responseBody.identity);
                expect(validIdentity.featureMask).to.equal(responseBody.featureMask);
            });

            it('error response', async function () {
                // Mock response
                mockFetchResponse(500, {info: 'Server error'});

                // Fetch identity
                await assertDirectoryError(
                    backend.identity(ensureIdentityString('ECHOECHO')),
                    'invalid',
                    'Identity data fetch request returned status 500',
                );
            });

            it('fetch error', async function () {
                // Ensure that fetch errors
                sinon.replace(
                    self,
                    'fetch',
                    sinon.fake.throws(new Error('fetch() is mocking you!')),
                );

                // Fetch identity
                await assertDirectoryError(
                    backend.identity(ensureIdentityString('ECHOECHO')),
                    'fetch',
                    'Identity data fetch request errored',
                );
            });
        });

        describe('private data (authenticated)', function () {
            const responseBody = {
                identity: 'ECHOECHO',
                serverGroup: 'f7',
                mobileNo: '41790001122',
            } as const;

            it('successful fetch', async function () {
                // Mock response
                mockFetchResponse(200, responseBody);

                // Fetch data
                const privateData = await backend.privateData(
                    ensureIdentityString(responseBody.identity),
                    ck,
                );
                expect(privateData.identity).to.equal(responseBody.identity);
                expect(privateData.serverGroup).to.equal(responseBody.serverGroup);
                expect(privateData.mobileNo).to.equal(responseBody.mobileNo);
                expect(privateData.email).to.be.undefined;
            });

            it('error response before auth', async function () {
                mockFetchResponse(500, {info: 'Server error'});
                await assertDirectoryError(
                    backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                    'authentication',
                    'Private data authentication fetch request returned status 500',
                );
            });

            it('fetch error before auth', async function () {
                sinon.replace(
                    self,
                    'fetch',
                    sinon.fake.throws(new Error('fetch() is mocking you!')),
                );
                await assertDirectoryError(
                    backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                    'fetch',
                    'Private data authentication fetch request errored',
                );
            });

            it('failed authentication', async function () {
                mockFetchResponse(200, {}, {authFails: true});
                await assertDirectoryError(
                    backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                    'authentication',
                    'Private data fetch authentication failed: Mocked failure',
                );
            });
        });
    });
}

run();
