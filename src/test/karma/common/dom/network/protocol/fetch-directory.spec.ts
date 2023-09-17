import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

import {CONFIG} from '~/common/config';
import {ensureNonce, NACL_CONSTANTS, type Nonce, type NonceHash, wrapRawKey} from '~/common/crypto';
import {SecureSharedBoxFactory} from '~/common/crypto/box';
import type {INonceGuard, INonceService} from '~/common/crypto/nonce';
import {TweetNaClBackend} from '~/common/crypto/tweetnacl';
import {randomBytes} from '~/common/dom/crypto/random';
import {FetchDirectoryBackend} from '~/common/dom/network/protocol/fetch-directory';
import {NonceScope} from '~/common/enum';
import {type Logger, type LoggerFactory, NOOP_LOGGER} from '~/common/logging';
import {DirectoryError, type DirectoryErrorType} from '~/common/network/protocol/directory';
import {ensureIdentityString} from '~/common/network/types';
import type {ClientKey} from '~/common/network/types/keys';
import type {u53} from '~/common/types';
import {assert, assertError} from '~/common/utils/assert';
import {u8aToBase64} from '~/common/utils/base64';
import {ValueObject} from '~/common/utils/object';

const {expect} = chai.use(sinonChai);

class NoopLoggerFactory implements LoggerFactory {
    public logger(tag: string, style?: string): Logger {
        return NOOP_LOGGER;
    }
}

/**
 * Create a response.
 *
 * @param status The response status code
 * @param body The response body
 */
function makeResponse(status: u53, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: new Headers({
            'Content-Type': 'application/json',
        }),
    });
}

/**
 * Mock a `fetch()`-response.
 *
 * @param status The mocked response status code.
 * @param authResponseBody The response body of the authentication request.
 * @param responseBody The response body of the final request.
 */
function mockFetchResponse(
    status: u53,
    authResponseBody: Record<string, unknown> | 'unauthenticated',
    responseBody: Record<string, unknown>,
): void {
    const fakeFetch = sinon.fake(
        // eslint-disable-next-line @typescript-eslint/require-await
        async (input: RequestInfo | URL, init?: RequestInit | undefined) => {
            // GET: No authentication
            if (init?.method === 'GET') {
                return makeResponse(status, responseBody);
            }

            // POST: Authentication
            const requestBody = (init?.body as string | undefined) ?? '';
            if (requestBody.includes('"response":')) {
                // Authenticated request
                return makeResponse(status, responseBody);
            }

            // Unauthenticated request
            assert(authResponseBody !== 'unauthenticated');
            return makeResponse(status, authResponseBody);
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
class TestNonceService implements INonceService {
    public checkAndRegisterNonce(scope: NonceScope, nonce: Nonce): INonceGuard {
        return {
            nonce,
            processed: new ValueObject(false),
            commit: () => {
                /* No-op */
            },
            discard: () => {
                /* No-op */
            },
        };
    }
    public getRandomNonce(scope: NonceScope): INonceGuard {
        return {
            nonce: ensureNonce(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
            processed: new ValueObject(false),
            commit: () => {
                /* No-op */
            },
            discard: () => {
                /* No-op */
            },
        };
    }
    public getAllPersistedNonces(scope: NonceScope): ReadonlySet<NonceHash> {
        return new Set();
    }
    public importNonces(scope: NonceScope, hashes: ReadonlySet<NonceHash>): void {}
}

/**
 * Config tests.
 */
export function run(): void {
    describe('FetchDirectoryBackend', function () {
        const backend = new FetchDirectoryBackend({
            config: CONFIG,
            logging: new NoopLoggerFactory(),
        });
        const crypto = new TweetNaClBackend(randomBytes);

        const ck = SecureSharedBoxFactory.consume(
            crypto,
            new TestNonceService(),
            NonceScope.CSP,
            wrapRawKey(
                randomBytes(new Uint8Array(NACL_CONSTANTS.KEY_LENGTH)),
                NACL_CONSTANTS.KEY_LENGTH,
            ),
        ) as ClientKey;

        this.beforeEach(function () {
            sinon.restore();
        });

        describe('identity (unauthenticated)', function () {
            it('successful fetch', async function () {
                // Mock response
                const responseBody = {
                    success: true,
                    identity: 'ECHOECHO',
                    publicKey: 'A77r4XgCosybW/RS11FXtJqkYn8yap8yaw/JvNX1RhI=',
                    featureLevel: 3,
                    featureMask: 9,
                    state: 0,
                    type: 0,
                } as const;
                mockFetchResponse(200, 'unauthenticated', responseBody);

                // Fetch identity
                const validIdentity = await backend.identity(
                    ensureIdentityString(responseBody.identity),
                );
                expect(validIdentity.identity).to.equal(responseBody.identity);
                expect(validIdentity.featureMask).to.equal(BigInt(responseBody.featureMask));
            });

            it('error response', async function () {
                // Mock response
                mockFetchResponse(500, 'unauthenticated', {success: false, error: 'Server error'});

                // Fetch identity
                await assertDirectoryError(
                    backend.identity(ensureIdentityString('ECHOECHO')),
                    'invalid-response',
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
            const authResponseBody = {
                token: u8aToBase64(Uint8Array.of(0xff, 1, 2, 3, 4, 5, 6)),
                tokenRespKeyPub: u8aToBase64(randomBytes(new Uint8Array(32))),
            };
            const responseBody = {
                success: true,
                identity: 'ECHOECHO',
                serverGroup: 'f7',
                mobileNo: '41790001122',
            } as const;

            it('successful fetch', async function () {
                // Mock response
                mockFetchResponse(200, authResponseBody, responseBody);

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
                mockFetchResponse(500, {success: false, error: 'Server error'}, {});
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
                mockFetchResponse(200, {success: false, error: 'Mocked failure'}, {});
                await assertDirectoryError(
                    backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                    'authentication',
                    'Private data authentication fetch failed: Mocked failure',
                );
            });

            it('invalid identity', async function () {
                mockFetchResponse(
                    200,
                    {
                        success: false,
                        errorType: 'invalid-identity',
                        error: 'Identity not found or revoked',
                    },
                    {},
                );
                await assertDirectoryError(
                    backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                    'invalid-identity',
                    'Identity not found or revoked',
                );
            });

            for (const apiErrorMessage of [
                'This is not a Threema Work identity.',
                'This identity is attached to a Threema Work account.',
            ]) {
                it(`wrong build variant ("${apiErrorMessage}")`, async function () {
                    mockFetchResponse(200, authResponseBody, {
                        success: false,
                        error: apiErrorMessage,
                        errorType: 'identity-transfer-prohibited',
                    });
                    await assertDirectoryError(
                        backend.privateData(ensureIdentityString('ECHOECHO'), ck),
                        'identity-transfer-prohibited',
                        apiErrorMessage,
                    );
                });
            }
        });
    });
}

run();
